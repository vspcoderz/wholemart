import { desc, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import AccountClient from "./AccountClient";

export const metadata = { title: "My account" };

export default async function VendorAccountPage() {
  const session = await auth();
  if (!session) return null;

  const [user] = await db
    .select({ balance: users.balance, businessName: users.businessName })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const rows = await db
    .select()
    .from(transactions)
    .where(eq(transactions.vendorId, session.user.id))
    .orderBy(desc(transactions.createdAt))
    .limit(100);

  return (
    <AccountClient
      businessName={user?.businessName ?? ""}
      balance={Number(user?.balance ?? 0)}
      txns={rows.map((t) => ({
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
