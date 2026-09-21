import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, transactions, users } from "@/db/schema";
import OrdersClient from "./OrdersClient";

export const metadata = { title: "History" };

const ORDER_LIMIT = 200;
const TXN_LIMIT = 100;

export default async function AdminHistoryPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await props.searchParams;
  const dateFilter =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : null;

  // History shows billed orders only — unbilled (PLACED) ones live in Billing.
  const where = dateFilter
    ? sql`${orders.windowDate} = ${dateFilter} and ${orders.status} <> 'PLACED'`
    : sql`${orders.status} <> 'PLACED'`;

  // Latest orders across ALL windows (capped — fast, no N+1).
  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      windowDate: orders.windowDate,
      placedAt: orders.placedAt,
      vendorName: users.businessName,
      tier: users.tier,
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
      users.tier,
    )
    .orderBy(desc(orders.placedAt))
    .limit(ORDER_LIMIT);

  const grandTotal = rows.reduce((s, r) => s + Number(r.total), 0);

  // Money trail: latest ledger entries across all retailers.
  const txns = await db
    .select({
      id: transactions.id,
      type: transactions.type,
      amount: transactions.amount,
      note: transactions.note,
      orderId: transactions.orderId,
      createdAt: transactions.createdAt,
      vendorName: users.businessName,
    })
    .from(transactions)
    .innerJoin(users, eq(users.id, transactions.vendorId))
    .orderBy(desc(transactions.createdAt))
    .limit(TXN_LIMIT);

  return (
    <OrdersClient
      windowDate={dateFilter}
      grandTotal={grandTotal}
      truncated={rows.length >= ORDER_LIMIT}
      rows={rows.map((o) => ({
        id: o.id,
        status: o.status,
        tier: o.tier,
        windowDate: o.windowDate,
        placedAt:
          o.placedAt instanceof Date
            ? o.placedAt.toISOString()
            : String(o.placedAt),
        vendorName: o.vendorName,
        total: Number(o.total),
        itemCount: o.itemCount,
      }))}
      txns={txns.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        note: t.note,
        orderId: t.orderId,
        createdAt:
          t.createdAt instanceof Date
            ? t.createdAt.toISOString()
            : String(t.createdAt),
        vendorName: t.vendorName,
      }))}
    />
  );
}
