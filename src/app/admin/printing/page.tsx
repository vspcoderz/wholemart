import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import type { Tier } from "@/db/schema";
import { TIERS } from "@/lib/format";
import PrintingClient from "./PrintingClient";

export const metadata = { title: "Printing" };

const LIMIT = 200;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function PrintingPage(props: {
  searchParams: Promise<{ from?: string; to?: string; retailers?: string; tiers?: string }>;
}) {
  const sp = await props.searchParams;
  const from = sp.from && DATE_RE.test(sp.from) ? sp.from : null;
  const to = sp.to && DATE_RE.test(sp.to) ? sp.to : null;
  const retailerIds = (sp.retailers ?? "")
    .split(",")
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0);
  const tiers = (sp.tiers ?? "")
    .split(",")
    .filter((t): t is Tier => (TIERS as string[]).includes(t));

  const retailers = await db
    .select({ id: users.id, businessName: users.businessName, tier: users.tier })
    .from(users)
    .where(eq(users.role, "VENDOR"))
    .orderBy(users.businessName);

  // Only billed orders (CONFIRMED / DELIVERED) — unbilled ones aren't valid.
  const conds = [sql`${orders.status} = 'CONFIRMED' or ${orders.status} = 'DELIVERED'`];
  if (from) conds.push(sql`${orders.windowDate} >= ${from}`);
  if (to) conds.push(sql`${orders.windowDate} <= ${to}`);
  if (retailerIds.length > 0) conds.push(inArray(orders.vendorId, retailerIds));
  if (tiers.length > 0) conds.push(inArray(users.tier, tiers));

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
    .where(and(...conds))
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
      from={from}
      to={to}
      retailerIds={retailerIds}
      tiers={tiers}
      retailers={retailers}
      truncated={rows.length >= LIMIT}
      rows={rows.map((o) => ({
        id: o.id,
        status: o.status as "CONFIRMED" | "DELIVERED",
        windowDate: o.windowDate,
        vendorName: o.vendorName,
        total: Number(o.total),
        itemCount: o.itemCount,
      }))}
    />
  );
}
