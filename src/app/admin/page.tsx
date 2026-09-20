import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, users } from "@/db/schema";
import { getWindowState, getSettings } from "@/lib/window";
import DashboardClient from "./DashboardClient";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const [win, cfg] = await Promise.all([getWindowState(), getSettings()]);

  const [vendorCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "VENDOR"));
  const [productCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.active, true));

  const todayOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      windowDate: orders.windowDate,
      vendorName: users.businessName,
      total: sql<string>`coalesce(sum(coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity}) * ${orderItems.unitPrice}), 0)`,
      itemCount: sql<number>`count(${orderItems.id})::int`,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.vendorId))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.windowDate, win.windowDate))
    .groupBy(
      orders.id,
      orders.status,
      orders.windowDate,
      users.businessName,
    )
    .orderBy(desc(orders.placedAt));

  return (
    <DashboardClient
      windowOpen={win.open}
      windowDate={win.windowDate}
      windowStartMinutes={cfg.windowStartMinutes}
      windowEndMinutes={cfg.windowEndMinutes}
      timezone={cfg.timezone}
      deliveryNote={cfg.deliveryNote ?? ""}
      vendorCount={vendorCount.n}
      productCount={productCount.n}
      orders={todayOrders.map((o) => ({
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
