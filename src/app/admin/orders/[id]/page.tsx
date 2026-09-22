import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { ArrowLeft, Printer } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import OrderEditor from "./OrderEditor";
import {
  ORDER_STATUS_LABELS,
  formatDateStr,
} from "@/lib/format";

export const metadata = { title: "Order detail" };

const STATUS_BADGE = {
  PLACED: "blue",
  CONFIRMED: "warning",
  DELIVERED: "success",
  CANCELLED: "gray",
} as const;

export default async function AdminOrderDetail(props: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await props.params;
  const orderId = Number(id);
  if (!Number.isInteger(orderId)) notFound();

  const row = (
    await db
      .select({ order: orders, vendor: users })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.vendorId))
      .where(eq(orders.id, orderId))
      .limit(1)
  )[0];
  if (!row) notFound();

  const items = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return (
    <div className="mx-auto flex w-full max-w-200 flex-col gap-4">
      <div>
        <Button size="sm" color="link-gray" href="/admin/orders">
          <ArrowLeft className="size-4" />
          All orders
        </Button>
        <div className="mt-2 flex items-center justify-between gap-2">
          <h1 className="text-display-xs font-semibold text-primary">
            {row.vendor.businessName}
          </h1>
          <Badge size="md" type="pill-color" color={STATUS_BADGE[row.order.status]}>
            {ORDER_STATUS_LABELS[row.order.status]}
          </Badge>
        </div>
        <p className="mt-1 text-sm text-tertiary">
          {formatDateStr(row.order.windowDate)} window · {row.vendor.phone ?? "no phone"} ·{" "}
          {row.vendor.address ?? "no address"}
        </p>
        <div className="mt-2">
          <Button
            size="sm"
            color="secondary"
            href={`/api/invoice/${orderId}`}
            {...{ target: "_blank", rel: "noopener noreferrer" }}
          >
            <Printer className="size-4" />
            Invoice PDF
          </Button>
        </div>
      </div>

      <OrderEditor
        orderId={orderId}
        status={row.order.status}
        adminNote={row.order.adminNote ?? ""}
        items={items.map((i) => ({
          id: i.id,
          name: i.productName,
          unit: i.unit,
          quantity: Number(i.quantity),
          confirmedQuantity: i.confirmedQuantity === null ? null : Number(i.confirmedQuantity),
          unitPrice: Number(i.unitPrice),
        }))}
      />
    </div>
  );
}
