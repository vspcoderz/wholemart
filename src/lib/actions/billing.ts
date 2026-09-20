"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, type Unit } from "@/db/schema";
import { UNITS } from "@/lib/format";
import { auth } from "@/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

export type BillingLineEdit = {
  itemId: number;
  orderId: number;
  unitPrice: number; // admin-set daily rate (overrides snapshot)
  quantity: number; // supplied quantity (stored as confirmedQuantity)
  unit: Unit; // billing unit (kg/g/bundle…)
};

export type FinalizeBillingResult =
  | { ok: true; billed: number }
  | { ok: false; error: string };

/**
 * Apply the billing draft to the selected orders:
 * - writes each line's rate / supplied qty / unit into order_items
 * - flips PLACED orders to CONFIRMED (= billed)
 * Cancelled orders are never touched.
 */
export async function finalizeBilling(
  windowDate: string,
  orderIds: number[],
  lines: BillingLineEdit[],
): Promise<FinalizeBillingResult> {
  await requireAdmin();

  if (!/^\d{4}-\d{2}-\d{2}$/.test(windowDate)) {
    return { ok: false, error: "Invalid window date." };
  }
  const ids = [...new Set(orderIds.filter((n) => Number.isInteger(n)))];
  if (ids.length === 0) {
    return { ok: false, error: "Select at least one order to bill." };
  }

  // Only bill orders that belong to this window and aren't cancelled.
  const targets = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(
      and(inArray(orders.id, ids), eq(orders.windowDate, windowDate)),
    );
  const billable = targets.filter((o) => o.status !== "CANCELLED");
  if (billable.length === 0) {
    return { ok: false, error: "Nothing billable in the selection." };
  }
  const billableIds = new Set(billable.map((o) => o.id));

  for (const l of lines) {
    if (!billableIds.has(l.orderId)) continue;
    if (!UNITS.includes(l.unit)) continue;
    if (!(l.unitPrice >= 0) || !(l.quantity >= 0)) continue;
    await db
      .update(orderItems)
      .set({
        unitPrice: l.unitPrice.toFixed(2),
        confirmedQuantity: String(l.quantity),
        unit: l.unit,
      })
      .where(
        and(
          eq(orderItems.id, l.itemId),
          eq(orderItems.orderId, l.orderId),
        ),
      );
  }

  // PLACED → CONFIRMED marks the order as billed.
  const placedIds = billable
    .filter((o) => o.status === "PLACED")
    .map((o) => o.id);
  if (placedIds.length > 0) {
    await db
      .update(orders)
      .set({ status: "CONFIRMED", updatedAt: new Date() })
      .where(inArray(orders.id, placedIds));
  }

  revalidatePath("/admin/billing");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/manifest");
  revalidatePath("/vendor/orders");
  return { ok: true, billed: billable.length };
}
