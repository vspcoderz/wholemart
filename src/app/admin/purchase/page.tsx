import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { getWindowState } from "@/lib/window";
import ManifestClient from "./ManifestClient";

export const metadata = { title: "Purchase" };

export default async function ManifestPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await props.searchParams;
  const win = await getWindowState();
  const windowDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : win.windowDate;

  const productTotals = await db
    .select({
      productId: orderItems.productId,
      name: orderItems.productName,
      unit: orderItems.unit,
      needed: sql<string>`sum(coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity}))`,
      vendors: sql<number>`count(distinct ${orders.vendorId})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(
      sql`${orders.windowDate} = ${windowDate} and ${orders.status} <> 'CANCELLED'`,
    )
    .groupBy(
      orderItems.productId,
      orderItems.productName,
      orderItems.unit,
    );

  const vendorOrders = await db
    .select({
      orderId: orders.id,
      vendorName: users.businessName,
      address: users.address,
      phone: users.phone,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.vendorId))
    .where(
      sql`${orders.windowDate} = ${windowDate} and ${orders.status} <> 'CANCELLED'`,
    )
    .groupBy(
      orders.id,
      users.businessName,
      users.address,
      users.phone,
      orders.status,
    );

  // One query for every line — grouped in JS (no per-order N+1).
  const allLines =
    vendorOrders.length === 0
      ? []
      : await db
          .select({
            orderId: orderItems.orderId,
            name: orderItems.productName,
            unit: orderItems.unit,
            qty: sql<string>`coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity})`,
          })
          .from(orderItems)
          .where(
            inArray(
              orderItems.orderId,
              vendorOrders.map((o) => o.orderId),
            ),
          );
  const linesByOrder = new Map<number, { name: string; unit: string; qty: number }[]>();
  for (const l of allLines) {
    const list = linesByOrder.get(l.orderId) ?? [];
    list.push({ name: l.name, unit: l.unit, qty: Number(l.qty) });
    linesByOrder.set(l.orderId, list);
  }
  const vendorItems = vendorOrders.map((o) => ({
    ...o,
    items: linesByOrder.get(o.orderId) ?? [],
  }));

  return (
    <ManifestClient
      windowDate={windowDate}
      productTotals={productTotals.map((p) => ({
        ...p,
        needed: Number(p.needed),
      }))}
      vendorItems={vendorItems.map((o) => ({
        ...o,
        items: o.items.map((it) => ({
          ...it,
          qty: Number(it.qty),
        })),
      }))}
    />
  );
}
