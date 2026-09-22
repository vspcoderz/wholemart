import { and, desc, eq, gte, inArray, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, transactions, users } from "@/db/schema";
import type { Tier } from "@/db/schema";
import { TIERS } from "@/lib/format";
import ReportsClient from "./ReportsClient";

export const metadata = { title: "Reports" };

const ORDER_LIMIT = 200;
const TXN_LIMIT = 200;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(v: string | undefined): string | null {
  return v && DATE_RE.test(v) ? v : null;
}

export default async function AdminReportsPage(props: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    retailers?: string;
    tiers?: string;
    tab?: string;
  }>;
}) {
  const sp = await props.searchParams;
  const from = parseDate(sp.from);
  const to = parseDate(sp.to);
  const retailerIds = (sp.retailers ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  const tiers = (sp.tiers ?? "")
    .split(",")
    .filter((t): t is Tier => (TIERS as string[]).includes(t));
  const tab = sp.tab === "outstanding" ? "outstanding" : "orders";

  // Retailers for the tag filter (small table).
  const retailers = await db
    .select({ id: users.id, businessName: users.businessName, tier: users.tier })
    .from(users)
    .where(eq(users.role, "VENDOR"))
    .orderBy(users.businessName);

  // Orders: billed only — unbilled (PLACED) ones live in Billing.
  const orderConds = [sql`${orders.status} <> 'PLACED'`];
  if (from) orderConds.push(sql`${orders.windowDate} >= ${from}`);
  if (to) orderConds.push(sql`${orders.windowDate} <= ${to}`);
  if (retailerIds.length > 0) orderConds.push(inArray(orders.vendorId, retailerIds));
  if (tiers.length > 0) orderConds.push(inArray(users.tier, tiers));

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
    .where(and(...orderConds))
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

  // Outstanding / money trail: same date-range + retailer filters apply here too.
  const txnConds = [];
  if (from) txnConds.push(gte(transactions.createdAt, new Date(`${from}T00:00:00Z`)));
  if (to) txnConds.push(lt(transactions.createdAt, new Date(`${to}T00:00:00Z`)));
  if (retailerIds.length > 0) txnConds.push(inArray(transactions.vendorId, retailerIds));
  if (tiers.length > 0) txnConds.push(inArray(users.tier, tiers));

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
    .where(txnConds.length > 0 ? and(...txnConds) : undefined)
    .orderBy(desc(transactions.createdAt))
    .limit(TXN_LIMIT);

  return (
    <ReportsClient
      initialTab={tab}
      from={from}
      to={to}
      retailerIds={retailerIds}
      tiers={tiers}
      retailers={retailers}
      grandTotal={grandTotal}
      truncated={rows.length >= ORDER_LIMIT}
      txnsTruncated={txns.length >= TXN_LIMIT}
      rows={rows.map((o) => ({
        id: o.id,
        status: o.status,
        tier: o.tier,
        windowDate: o.windowDate,
        placedAt:
          o.placedAt instanceof Date ? o.placedAt.toISOString() : String(o.placedAt),
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
          t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
        vendorName: t.vendorName,
      }))}
    />
  );
}
