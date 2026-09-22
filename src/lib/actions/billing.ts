"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, transactions, users, type Unit } from "@/db/schema";
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
    .select({ id: orders.id, status: orders.status, vendorId: orders.vendorId })
    .from(orders)
    .where(
      and(inArray(orders.id, ids), eq(orders.windowDate, windowDate)),
    );
  const billable = targets.filter((o) => o.status !== "CANCELLED");
  if (billable.length === 0) {
    return { ok: false, error: "Nothing billable in the selection." };
  }
  const billableIds = new Set(billable.map((o) => o.id));

  // All writes happen in one transaction — a failed finalize never leaves
  // half-written lines, half-flipped statuses or a ledger without a balance.
  await db.transaction(async (tx) => {
    for (const l of lines) {
      if (!billableIds.has(l.orderId)) continue;
      if (!UNITS.includes(l.unit)) continue;
      if (!(l.unitPrice >= 0) || !(l.quantity >= 0)) continue;
      await tx
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
      await tx
        .update(orders)
        .set({ status: "CONFIRMED", updatedAt: new Date() })
        .where(inArray(orders.id, placedIds));
    }

    // Ledger: charge each vendor the finalized total of their billed orders and
    // bump their outstanding balance. Re-billing an order re-charges only the
    // delta vs its previous CHARGE (avoids double-counting on edits).
    const vendorOf = new Map(billable.map((o) => [o.id, o.vendorId]));
    const perOrder = new Map<number, number>();
    for (const l of lines) {
      if (!billableIds.has(l.orderId)) continue;
      perOrder.set(
        l.orderId,
        (perOrder.get(l.orderId) ?? 0) + l.unitPrice * l.quantity,
      );
    }
    const prevCharges =
      perOrder.size === 0
        ? []
        : await tx
            .select({
              orderId: transactions.orderId,
              total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
            })
            .from(transactions)
            .where(
              and(
                inArray(transactions.orderId, [...perOrder.keys()]),
                eq(transactions.type, "CHARGE"),
              ),
            )
            .groupBy(transactions.orderId);
    const prevByOrder = new Map(
      prevCharges.map((r) => [r.orderId as number, Number(r.total)]),
    );
    const perVendor = new Map<number, { delta: number; orders: number[] }>();
    for (const [orderId, total] of perOrder) {
      const delta = total - (prevByOrder.get(orderId) ?? 0);
      if (!(delta > 0.004) && !(delta < -0.004)) continue;
      const vendorId = vendorOf.get(orderId);
      if (!vendorId) continue;
      const row = perVendor.get(vendorId) ?? { delta: 0, orders: [] };
      row.delta += delta;
      row.orders.push(orderId);
      perVendor.set(vendorId, row);
    }
    for (const [vendorId, { delta, orders: oids }] of perVendor) {
      for (const orderId of oids) {
        const total = perOrder.get(orderId) ?? 0;
        const prev = prevByOrder.get(orderId) ?? 0;
        const share = total - prev;
        if (!(share > 0.004) && !(share < -0.004)) continue;
        await tx.insert(transactions).values({
          vendorId,
          type: "CHARGE",
          amount: share.toFixed(2),
          orderId,
          note: `Billing ${windowDate} · order #${orderId}`,
        });
      }
      await tx
        .update(users)
        .set({ balance: sql`${users.balance} + ${delta.toFixed(2)}` })
        .where(eq(users.id, vendorId));
    }
  });

  revalidatePath("/admin/billing");
  revalidatePath("/admin/orders");
  revalidatePath("/admin");
  revalidatePath("/admin/purchase");
  revalidatePath("/admin/accounting");
  revalidatePath("/vendor/transactions");
  revalidatePath("/vendor/transactions");
  return { ok: true, billed: billable.length };
}
