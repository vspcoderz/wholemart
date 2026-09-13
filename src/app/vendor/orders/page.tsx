import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { orderItems, orders } from "@/db/schema";
import OrdersClient from "./OrdersClient";
import { getWindowState } from "@/lib/window";

export const metadata = { title: "My orders" };

export default async function VendorOrdersPage() {
  const session = await auth();
  const win = await getWindowState();
  if (!session) return null;

  const myOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.vendorId, session.user.id))
    .orderBy(desc(orders.windowDate));

  const withItems = await Promise.all(
    myOrders.map(async (o) => {
      const rows = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, o.id));
      return {
        id: o.id,
        windowDate: o.windowDate,
        status: o.status,
        adminNote: o.adminNote,
        itemCount: rows.length,
        total: rows.reduce(
          (s, r) =>
            s + Number(r.confirmedQuantity ?? r.quantity) * Number(r.unitPrice),
          0,
        ),
        currentWindow: o.windowDate === win.windowDate,
      };
    }),
  );

  return (
    <OrdersClient
      orders={withItems}
      currentWindowOpen={win.open}
    />
  );
}
