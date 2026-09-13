import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { Box, Button, Chip, Typography } from "@mui/material";
import { ArrowBack, Download } from "@mui/icons-material";
import Link from "next/link";
import OrderEditor from "./OrderEditor";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  formatDateStr,
} from "@/lib/format";

export const metadata = { title: "Order detail" };

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
    <Box sx={{ maxWidth: 800 }}>
      <Link href="/admin/orders">
        <Button startIcon={<ArrowBack />} size="small" sx={{ mb: 2 }}>
          All orders
        </Button>
      </Link>

      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          {row.vendor.businessName}
        </Typography>
        <Chip
          label={ORDER_STATUS_LABELS[row.order.status]}
          color={ORDER_STATUS_COLORS[row.order.status] as never}
        />
      </Box>
      <Typography color="text.secondary" gutterBottom>
        {formatDateStr(row.order.windowDate)} window · {row.vendor.phone ?? "no phone"} ·{" "}
        {row.vendor.address ?? "no address"}
      </Typography>

      <Button
        size="small"
        startIcon={<Download />}
        href={`/api/invoice/${orderId}`}
        target="_blank"
        sx={{ mb: 2 }}
      >
        Invoice PDF
      </Button>

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
    </Box>
  );
}
