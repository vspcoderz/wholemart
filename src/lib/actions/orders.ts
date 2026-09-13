"use server";

import { revalidatePath } from "next/cache";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products } from "@/db/schema";
import { auth } from "@/auth";
import { getWindowState } from "@/lib/window";

export type CartItemInput = { productId: number; quantity: number };

export type PlaceOrderResult =
  | { ok: true; orderId: number }
  | { ok: false; error: string };

/**
 * Create or replace the vendor's order for the current window.
 * Prices are always taken from the DB, never trusted from the client.
 */
export async function saveOrder(items: CartItemInput[]): Promise<PlaceOrderResult> {
  const session = await auth();
  if (!session || session.user.role !== "VENDOR") {
    return { ok: false, error: "Not signed in as a vendor." };
  }

  const win = await getWindowState();
  if (!win.open) {
    return { ok: false, error: "The ordering window is closed." };
  }

  const clean = items.filter((i) => Number(i.quantity) > 0);
  if (clean.length === 0) {
    return { ok: false, error: "Add at least one item." };
  }

  const ids = clean.map((i) => i.productId);
  const catalog = await db
    .select()
    .from(products)
    .where(and(inArray(products.id, ids), eq(products.active, true)));
  if (catalog.length !== ids.length) {
    return { ok: false, error: "Some products are no longer available." };
  }

  const vendorId = session.user.id;

  // One order per vendor per window — upsert semantics
  let order = (
    await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.vendorId, vendorId),
          eq(orders.windowDate, win.windowDate),
        ),
      )
      .limit(1)
  )[0];

  if (!order) {
    order = (
      await db
        .insert(orders)
        .values({ vendorId, windowDate: win.windowDate })
        .returning()
    )[0];
  } else if (order.status !== "PLACED") {
    return {
      ok: false,
      error: `This order was already ${order.status.toLowerCase()} by the admin and can't be edited.`,
    };
  }

  await db.delete(orderItems).where(eq(orderItems.orderId, order.id));
  await db.insert(orderItems).values(
    clean.map((i) => {
      const p = catalog.find((c) => c.id === i.productId)!;
      return {
        orderId: order.id,
        productId: p.id,
        productName: p.name,
        unit: p.unit,
        unitPrice: p.pricePerUnit,
        quantity: String(i.quantity),
      };
    }),
  );

  revalidatePath("/vendor");
  revalidatePath("/vendor/orders");
  revalidatePath("/admin");
  return { ok: true, orderId: order.id };
}

/** Vendor cancels their own order while the window is still open. */
export async function cancelMyOrder(): Promise<PlaceOrderResult> {
  const session = await auth();
  if (!session || session.user.role !== "VENDOR") {
    return { ok: false, error: "Not signed in as a vendor." };
  }
  const win = await getWindowState();
  if (!win.open) return { ok: false, error: "The ordering window is closed." };

  const order = (
    await db
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.vendorId, session.user.id),
          eq(orders.windowDate, win.windowDate),
        ),
      )
      .limit(1)
  )[0];
  if (!order || order.status !== "PLACED") {
    return { ok: false, error: "Nothing to cancel." };
  }
  await db.delete(orders).where(eq(orders.id, order.id));
  revalidatePath("/vendor");
  revalidatePath("/vendor/orders");
  return { ok: true, orderId: order.id };
}

/**
 * Copies a past order's items into the cart for the current window.
 * Returns the items so the client can hydrate its cart state.
 */
export async function repeatOrder(
  orderId: number,
): Promise<{ ok: boolean; items: CartItemInput[]; error?: string }> {
  const session = await auth();
  if (!session || session.user.role !== "VENDOR") {
    return { ok: false, items: [], error: "Not signed in." };
  }
  const win = await getWindowState();
  if (!win.open) {
    return { ok: false, items: [], error: "Wait for the window to open." };
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, orderId), eq(orders.vendorId, session.user.id)))
    .limit(1);
  if (!order) return { ok: false, items: [], error: "Order not found." };

  const rows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));

  return {
    ok: true,
    items: rows.map((r) => ({ productId: r.productId, quantity: Number(r.quantity) })),
  };
}
