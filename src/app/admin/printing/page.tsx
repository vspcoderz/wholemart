import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import PrintingClient from "./PrintingClient";

export const metadata = { title: "Printing" };

const LIMIT = 200;

export default async function PrintingPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await props.searchParams;
  const dateFilter =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;

  // Only billed orders (CONFIRMED / DELIVERED) — capped, single query.
  const where = dateFilter
    ? sql`${orders.windowDate} = ${dateFilter} and ${orders.status} <> 'PLACED' and ${orders.status} <> 'CANCELLED'`
    : sql`${orders.status} <> 'PLACED' and ${orders.status} <> 'CANCELLED'`;

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      windowDate: orders.windowDate,
      placedAt: orders.placedAt,
      vendorName: users.businessName,
      total: sql<string>`coalesce(sum(coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity}) * ${orderItems.unitPrice}), 0)`,
      itemCount: sql<number>`count(${orderItems.id})::int`,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.vendorId))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(where)
    .groupBy(
      orders.id,
      orders.status,
      orders.windowDate,
      orders.placedAt,
      users.businessName,
    )
    .orderBy(desc(orders.placedAt))
    .limit(LIMIT);

  return (
    <PrintingClient
      windowDate={dateFilter}
      truncated={rows.length >= LIMIT}
      rows={rows.map((o) => ({
        id: o.id,
        status: o.status,
        windowDate: o.windowDate,
        vendorName: o.vendorName,
        total: Number(o.total),
        itemCount: o.itemCount,
      }))}
    />
  );
}
