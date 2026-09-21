import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, users } from "@/db/schema";
import { getSettings } from "@/lib/window";
import DashboardClient from "./DashboardClient";

export const metadata = { title: "Statistics" };

const lineTotal = sql<string>`coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity}) * ${orderItems.unitPrice}`;
const liveOrders = sql`${orders.status} <> 'CANCELLED'`;

export default async function AdminDashboard() {
  // One batch of small aggregate queries — no N+1, all capped.
  const [
    [counts],
    [revenue],
    [outstanding],
    dayRevenue,
    topProducts,
    topRetailers,
    recentOrders,
    cfg,
  ] = await Promise.all([
    db
      .select({
        vendors: sql<number>`count(*) filter (where ${users.role} = 'VENDOR')::int`,
        activeProducts: sql<number>`(select count(*)::int from ${products} where ${products.active})`,
        totalOrders: sql<number>`(select count(*)::int from ${orders})`,
        billedOrders: sql<number>`(select count(*)::int from ${orders} where ${orders.status} <> 'PLACED' and ${orders.status} <> 'CANCELLED')`,
      })
      .from(users)
      .limit(1),
    db
      .select({
        total: sql<string>`coalesce(sum(${lineTotal}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(liveOrders),
    db
      .select({
        total: sql<string>`coalesce(sum(${users.balance}), 0)`,
      })
      .from(users)
      .where(eq(users.role, "VENDOR")),
    db
      .select({
        windowDate: orders.windowDate,
        orders: sql<number>`count(distinct ${orders.id})::int`,
        revenue: sql<string>`coalesce(sum(${lineTotal}), 0)`,
      })
      .from(orders)
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(liveOrders)
      .groupBy(orders.windowDate)
      .orderBy(desc(orders.windowDate))
      .limit(7),
    db
      .select({
        name: orderItems.productName,
        qty: sql<string>`sum(coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity}))`,
        revenue: sql<string>`coalesce(sum(${lineTotal}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orders.id, orderItems.orderId))
      .where(liveOrders)
      .groupBy(orderItems.productName)
      .orderBy(desc(sql`sum(${lineTotal})`))
      .limit(5),
    db
      .select({
        name: users.businessName,
        orders: sql<number>`count(distinct ${orders.id})::int`,
        revenue: sql<string>`coalesce(sum(${lineTotal}), 0)`,
        balance: users.balance,
      })
      .from(users)
      .innerJoin(orders, eq(orders.vendorId, users.id))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .where(sql`${users.role} = 'VENDOR' and ${liveOrders}`)
      .groupBy(users.id, users.businessName, users.balance)
      .orderBy(desc(sql`sum(${lineTotal})`))
      .limit(5),
    db
      .select({
        id: orders.id,
        status: orders.status,
        windowDate: orders.windowDate,
        placedAt: orders.placedAt,
        vendorName: users.businessName,
        total: sql<string>`coalesce(sum(${lineTotal}), 0)`,
        itemCount: sql<number>`count(${orderItems.id})::int`,
      })
      .from(orders)
      .innerJoin(users, eq(users.id, orders.vendorId))
      .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
      .groupBy(
        orders.id,
        orders.status,
        orders.windowDate,
        orders.placedAt,
        users.businessName,
      )
      .orderBy(desc(orders.placedAt))
      .limit(8),
    getSettings(),
  ]);

  return (
    <DashboardClient
      windowStartMinutes={cfg.windowStartMinutes}
      windowEndMinutes={cfg.windowEndMinutes}
      vendorCount={counts.vendors}
      productCount={counts.activeProducts}
      totalOrders={counts.totalOrders}
      billedOrders={counts.billedOrders}
      totalRevenue={Number(revenue.total)}
      outstanding={Number(outstanding.total)}
      dayRevenue={dayRevenue.map((d) => ({
        windowDate: d.windowDate,
        orders: d.orders,
        revenue: Number(d.revenue),
      }))}
      topProducts={topProducts.map((p) => ({
        name: p.name,
        qty: Number(p.qty),
        revenue: Number(p.revenue),
      }))}
      topRetailers={topRetailers.map((r) => ({
        name: r.name,
        orders: r.orders,
        revenue: Number(r.revenue),
        balance: Number(r.balance),
      }))}
      recentOrders={recentOrders.map((o) => ({
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
