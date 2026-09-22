import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import AccountingClient from "./AccountingClient";

export const metadata = { title: "Accounting" };

const LEDGER_LIMIT = 100;

export default async function AccountingPage(props: {
  searchParams: Promise<{ retailer?: string }>;
}) {
  const { retailer: retailerParam } = await props.searchParams;
  const activeRetailerId =
    retailerParam && /^\d+$/.test(retailerParam) ? Number(retailerParam) : null;

  const retailers = await db
    .select({
      id: users.id,
      businessName: users.businessName,
      phone: users.phone,
      active: users.active,
      balance: users.balance,
      tier: users.tier,
    })
    .from(users)
    .where(eq(users.role, "VENDOR"))
    .orderBy(asc(users.businessName));

  // Latest 60 ledger entries overall, grouped per retailer in JS (fast,
  // covers the active retailers without N+1).
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

  // Full ledger for the workbench's active retailer.
  const activeLedger =
    activeRetailerId === null
      ? []
      : await db
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
          .where(eq(transactions.vendorId, activeRetailerId))
          .orderBy(desc(transactions.createdAt))
          .limit(LEDGER_LIMIT);

  const outstanding = retailers.reduce((s, r) => s + Number(r.balance), 0);

  const toClient = (t: (typeof recent)[number]) => ({
    id: t.id,
    vendorId: t.vendorId,
    type: t.type,
    amount: Number(t.amount),
    note: t.note,
    orderId: t.orderId,
    createdAt:
      t.createdAt instanceof Date ? t.createdAt.toISOString() : String(t.createdAt),
  });

  return (
    <AccountingClient
      outstanding={outstanding}
      activeRetailerId={activeRetailerId}
      activeLedger={activeLedger.map(toClient)}
      retailers={retailers.map((r) => ({
        id: r.id,
        businessName: r.businessName,
        phone: r.phone,
        active: r.active,
        balance: Number(r.balance),
        tier: r.tier,
      }))}
      recent={recent.map(toClient)}
    />
  );
}
