import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import AccountingClient from "./AccountingClient";

export const metadata = { title: "Accounting" };

export default async function AccountingPage() {
  const retailers = await db
    .select({
      id: users.id,
      businessName: users.businessName,
      phone: users.phone,
      active: users.active,
      balance: users.balance,
    })
    .from(users)
    .where(eq(users.role, "VENDOR"))
    .orderBy(asc(users.businessName));

  // Latest 5 ledger entries per retailer would be N+1 — instead take the
  // latest 60 overall and group in JS (fast, covers the active retailers).
  const recent = await db
    .select({
      id: transactions.id,
      vendorId: transactions.vendorId,
      type: transactions.type,
      amount: transactions.amount,
      note: transactions.note,
      orderId: transactions.orderId,
      createdAt: transactions.createdAt,
    })
    .from(transactions)
    .orderBy(desc(transactions.createdAt))
    .limit(60);

  const outstanding = retailers.reduce((s, r) => s + Number(r.balance), 0);

  return (
    <AccountingClient
      outstanding={outstanding}
      retailers={retailers.map((r) => ({
        id: r.id,
        businessName: r.businessName,
        phone: r.phone,
        active: r.active,
        balance: Number(r.balance),
      }))}
      recent={recent.map((t) => ({
        id: t.id,
        vendorId: t.vendorId,
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
