import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { orderItems, orders, transactions, users } from "@/db/schema";
import { getWindowState } from "@/lib/window";
import TransactionClient from "./TransactionClient";

export const metadata = { title: "Transactions" };

export default async function VendorTransactionsPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const session = await auth();
  if (!session) return null;
  const { tab } = await props.searchParams;
  const win = await getWindowState();

  const [myOrders, [user]] = await Promise.all([
    db
      .select()
      .from(orders)
      .where(eq(orders.vendorId, session.user.id))
      .orderBy(desc(orders.windowDate))
      .limit(100),
    db
      .select({ balance: users.balance, businessName: users.businessName })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1),
  ]);

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
        paymentMethod: o.paymentMethod,
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

  const ledger = await db
    .select()
    .from(transactions)
    .where(eq(transactions.vendorId, session.user.id))
    .orderBy(desc(transactions.createdAt))
    .limit(100);

  return (
    <TransactionClient
      initialTab={tab === "account" ? "account" : "orders"}
      orders={withItems}
      currentWindowOpen={win.open}
      businessName={user?.businessName ?? ""}
      balance={Number(user?.balance ?? 0)}
      txns={ledger.map((t) => ({
        id: t.id,
        type: t.type,
        amount: Number(t.amount),
        note: t.note,
        orderId: t.orderId,
        createdAt:
          t.createdAt instanceof Date
            ? t.createdAt.toISOString()
            : String(t.createdAt),
      }))}
    />
  );
}
