"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { transactions, users } from "@/db/schema";
import { PAYMENT_METHODS } from "@/lib/format";
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
  revalidatePath("/vendor/transactions");
}

/** Record money received from a retailer — reduces their outstanding balance. */
export async function recordPayment(
  vendorId: number,
  amount: number,
  note: string,
  paymentMethod?: string,
) {
  await requireAdmin();
  if (!Number.isInteger(vendorId)) return { ok: false as const, error: "Bad retailer." };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false as const, error: "Amount must be more than 0." };
  }
  const cleanNote = note.trim() || "Payment received";
  const method =
    paymentMethod && (PAYMENT_METHODS as readonly string[]).includes(paymentMethod)
      ? paymentMethod
      : null;
  const [v] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, vendorId))
    .limit(1);
  if (!v) return { ok: false as const, error: "Retailer not found." };

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      vendorId,
      type: "PAYMENT",
      amount: (-amount).toFixed(2),
      note: method ? `${cleanNote} · ${method}` : cleanNote,
      paymentMethod: method,
    });
    await tx
      .update(users)
      .set({ balance: sql`${users.balance} - ${amount.toFixed(2)}` })
      .where(eq(users.id, vendorId));
  });
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
  const cleanNote = note.trim() || "Manual adjustment";
  const [v] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, vendorId))
    .limit(1);
  if (!v) return { ok: false as const, error: "Retailer not found." };

  await db.transaction(async (tx) => {
    await tx.insert(transactions).values({
      vendorId,
      type: "ADJUSTMENT",
      amount: amount.toFixed(2),
      note: cleanNote,
    });
    await tx
      .update(users)
      .set({ balance: sql`${users.balance} + ${amount.toFixed(2)}` })
      .where(eq(users.id, vendorId));
  });
  touch();
  return { ok: true as const };
}
