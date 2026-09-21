"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  orderItems,
  orders,
  products,
  settings,
  tierEnum,
  users,
  type Category,
  type Tier,
  type Unit,
} from "@/db/schema";
import { auth } from "@/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session;
}

/* ---------------- Products ---------------- */

export type ProductInput = {
  id?: number;
  name: string;
  nameMr?: string;
  emoji?: string;
  category: Category;
  unit: Unit;
  pricePerUnit: number;
  imageUrl?: string;
  description?: string;
  active: boolean;
};

export async function saveProduct(input: ProductInput) {
  await requireAdmin();
  if (!input.name.trim()) return { ok: false, error: "Name is required." };
  if (!(input.pricePerUnit >= 0)) {
    return { ok: false, error: "Price must be 0 or more." };
  }

  const values = {
    name: input.name.trim(),
    nameMr: input.nameMr?.trim() || null,
    emoji: input.emoji?.trim() || null,
    category: input.category,
    unit: input.unit,
    pricePerUnit: input.pricePerUnit.toFixed(2),
    imageUrl: input.imageUrl?.trim() || null,
    description: input.description?.trim() || null,
    active: input.active,
  };

  if (input.id) {
    await db.update(products).set(values).where(eq(products.id, input.id));
  } else {
    await db.insert(products).values(values);
  }
  revalidatePath("/admin/settings");
  revalidatePath("/vendor");
  return { ok: true as const };
}

export async function toggleProduct(id: number, active: boolean) {
  await requireAdmin();
  await db.update(products).set({ active }).where(eq(products.id, id));
  revalidatePath("/admin/settings");
  revalidatePath("/vendor");
  return { ok: true as const };
}

export async function deleteProduct(id: number) {
  await requireAdmin();
  try {
    // order_items keep their name/unit/price snapshots; product_id nulls out.
    await db.delete(products).where(eq(products.id, id));
  } catch (e) {
    const code = (e as { code?: string })?.code;
    return {
      ok: false as const,
      error:
        code === "23503"
          ? "This product is referenced by active orders — disable it instead."
          : "Delete failed.",
    };
  }
  revalidatePath("/admin/settings");
  revalidatePath("/vendor");
  return { ok: true as const };
}

/* ---------------- Vendors ---------------- */

export type VendorInput = {
  id?: number;
  email: string;
  password?: string; // required for new, optional reset for existing
  businessName: string;
  contactPerson?: string;
  phone?: string;
  address?: string;
  active: boolean;
  tier: Tier;
};

export async function saveVendor(input: VendorInput) {
  await requireAdmin();
  const email = input.email.trim().toLowerCase();
  if (!email || !input.businessName.trim()) {
    return { ok: false, error: "Email and business name are required." };
  }
  if (!input.id && !input.password) {
    return { ok: false, error: "Password is required for a new vendor." };
  }
  const tier: Tier = (tierEnum.enumValues as string[]).includes(input.tier)
    ? input.tier
    : "TIER_3";

  const clash = await db
    .select({ id: users.id })
    .from(users)
    .where(input.id ? and(eq(users.email, email), ne(users.id, input.id)) : eq(users.email, email))
    .limit(1);
  if (clash.length) return { ok: false, error: "Email already in use." };

  if (input.id) {
    await db
      .update(users)
      .set({
        email,
        businessName: input.businessName.trim(),
        contactPerson: input.contactPerson?.trim() || null,
        phone: input.phone?.trim() || null,
        address: input.address?.trim() || null,
        active: input.active,
        tier,
        ...(input.password
          ? { passwordHash: await bcrypt.hash(input.password, 10) }
          : {}),
      })
      .where(eq(users.id, input.id));
  } else {
    await db.insert(users).values({
      email,
      passwordHash: await bcrypt.hash(input.password!, 10),
      role: "VENDOR",
      businessName: input.businessName.trim(),
      contactPerson: input.contactPerson?.trim() || null,
      phone: input.phone?.trim() || null,
      address: input.address?.trim() || null,
      active: input.active,
      tier,
    });
  }
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

export async function toggleVendor(id: number, active: boolean) {
  await requireAdmin();
  await db.update(users).set({ active }).where(eq(users.id, id));
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

/**
 * Delete a retailer. Their order history is deleted with them (FK cascade),
 * so the UI must pass force=true after a second confirmation.
 */
export async function deleteVendor(id: number, force = false) {
  await requireAdmin();
  const [v] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, id))
    .limit(1);
  if (!v || v.role !== "VENDOR") {
    return { ok: false as const, error: "Not a retailer account." };
  }
  const [oc] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orders)
    .where(eq(orders.vendorId, id));
  if (oc.n > 0 && !force) {
    return { ok: false as const, error: `HAS_ORDERS:${oc.n}` };
  }
  await db.delete(users).where(eq(users.id, id));
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  return { ok: true as const };
}

/* ---------------- Orders ---------------- */

export async function setOrderStatus(
  orderId: number,
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED",
) {
  await requireAdmin();
  await db
    .update(orders)
    .set({ status, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/vendor/transactions");
  return { ok: true as const };
}

export type AdminItemEdit = {
  itemId: number;
  quantity: number; // admin-adjusted quantity
};

export async function adjustOrderItems(
  orderId: number,
  adminNote: string,
  edits: AdminItemEdit[],
) {
  await requireAdmin();
  // Reverting a line to its ordered qty clears the override (NULL) instead
  // of storing a redundant confirmed value.
  const current = await db
    .select({ id: orderItems.id, quantity: orderItems.quantity })
    .from(orderItems)
    .where(eq(orderItems.orderId, orderId));
  const orderedQty = new Map(current.map((r) => [r.id, Number(r.quantity)]));
  for (const e of edits) {
    if (!Number.isFinite(e.quantity) || e.quantity < 0) continue;
    const reset = orderedQty.get(e.itemId) === e.quantity;
    await db
      .update(orderItems)
      .set({ confirmedQuantity: reset ? null : String(e.quantity) })
      .where(and(eq(orderItems.id, e.itemId), eq(orderItems.orderId, orderId)));
  }
  await db
    .update(orders)
    .set({ adminNote: adminNote.trim() || null, updatedAt: new Date() })
    .where(eq(orders.id, orderId));
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/vendor/transactions");
  return { ok: true as const };
}

/* ---------------- Settings ---------------- */

export async function updateSettings(input: {
  windowStartMinutes: number;
  windowEndMinutes: number;
  timezone: string;
  language: "mr" | "en";
  deliveryNote: string;
}) {
  await requireAdmin();
  if (
    input.windowStartMinutes < 0 ||
    input.windowStartMinutes > 1439 ||
    input.windowEndMinutes < 0 ||
    input.windowEndMinutes > 1439 ||
    input.windowStartMinutes === input.windowEndMinutes
  ) {
    return { ok: false, error: "Invalid window times." };
  }
  await db
    .insert(settings)
    .values({
      id: 1,
      windowStartMinutes: input.windowStartMinutes,
      windowEndMinutes: input.windowEndMinutes,
      timezone: input.timezone,
      language: input.language,
      deliveryNote: input.deliveryNote.trim() || null,
    })
    .onConflictDoUpdate({
      target: settings.id,
      set: {
        windowStartMinutes: input.windowStartMinutes,
        windowEndMinutes: input.windowEndMinutes,
        timezone: input.timezone,
        language: input.language,
        deliveryNote: input.deliveryNote.trim() || null,
      },
    });
  revalidatePath("/admin/settings");
  revalidatePath("/admin");
  revalidatePath("/vendor");
  return { ok: true as const };
}
