"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import { auth } from "@/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

function touch() {
  revalidatePath("/admin/accounting");
  revalidatePath("/admin");
  revalidatePath("/vendor/account");
}

/** Record money received from a retailer — reduces their outstanding balance. */
export async function recordPayment(
  vendorId: number,
  amount: number,
  note: string,
) {
  await requireAdmin();
  if (!Number.isInteger(vendorId)) return { ok: false as const, error: "Bad retailer." };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: "Amount must be more than 0." };
  }
  const [v] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, vendorId))
    .limit(1);
  if (!v) return { ok: false as const, error: "Retailer not found." };

  await db.insert(transactions).values({
    vendorId,
    type: "PAYMENT",
    amount: (-amount).toFixed(2),
    note: note.trim() || "Payment received",
  });
  await db
    .update(users)
    .set({ balance: sql`${users.balance} - ${amount.toFixed(2)}` })
    .where(eq(users.id, vendorId));
  touch();
  return { ok: true as const };
}

/**
 * Manual correction (opening outstanding, write-off, etc.).
 * Positive amount increases what they owe, negative decreases it.
 */
export async function recordAdjustment(
  vendorId: number,
  amount: number,
  note: string,
) {
  await requireAdmin();
  if (!Number.isInteger(vendorId)) return { ok: false as const, error: "Bad retailer." };
  if (!Number.isFinite(amount) || amount === 0) {
    return { ok: false as const, error: "Amount can't be zero." };
  }
  if (!note.trim()) {
    return { ok: false as const, error: "A note is required for adjustments." };
  }
  const [v] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, vendorId))
    .limit(1);
  if (!v) return { ok: false as const, error: "Retailer not found." };

  await db.insert(transactions).values({
    vendorId,
    type: "ADJUSTMENT",
    amount: amount.toFixed(2),
    note: note.trim(),
  });
  await db
    .update(users)
    .set({ balance: sql`${users.balance} + ${amount.toFixed(2)}` })
    .where(eq(users.id, vendorId));
  touch();
  return { ok: true as const };
}
