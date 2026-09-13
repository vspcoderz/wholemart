import type { Category, Unit } from "@/db/schema";

export const CATEGORY_LABELS: Record<Category, string> = {
  LOCAL_VEG: "Vegetables",
  ENGLISH_VEG: "English Veg",
  FRUITS: "Fruits",
};

export const CATEGORIES: Category[] = ["LOCAL_VEG", "ENGLISH_VEG", "FRUITS"];

export const CATEGORY_EMOJI: Record<Category, string> = {
  LOCAL_VEG: "🥬",
  ENGLISH_VEG: "🥦",
  FRUITS: "🍎",
};

export const UNIT_LABELS: Record<Unit, string> = {
  KG: "kg",
  G: "g",
  DOZEN: "dozen",
  PIECE: "pc",
  CRATE: "crate",
  BOX: "box",
  BUNDLE: "bundle",
};

export const UNITS: Unit[] = ["KG", "G", "DOZEN", "PIECE", "CRATE", "BOX", "BUNDLE"];

/** Stepper step for each unit (dozen/pieces step whole numbers). */
export const UNIT_STEPS: Record<Unit, number> = {
  KG: 0.5,
  G: 50,
  DOZEN: 1,
  PIECE: 1,
  CRATE: 1,
  BOX: 1,
  BUNDLE: 1,
};

export const inr = (n: number | string): string =>
  `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function formatQty(qty: number | string, unit: Unit): string {
  const n = Number(qty);
  if (unit === "G") {
    return n >= 1000 ? `${trim(n / 1000)} kg` : `${trim(n)} g`;
  }
  return `${trim(n)} ${UNIT_LABELS[unit]}`;
}

function trim(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(n % 1 === 0 ? 0 : 2);
}

export function lineTotal(
  qty: number | string,
  unitPrice: number | string,
  unit: Unit,
): number {
  // For grams the stored quantity is in grams; unit price is per gram.
  return Number(qty) * Number(unitPrice);
}

export const ORDER_STATUS_LABELS = {
  PLACED: "Placed",
  CONFIRMED: "Confirmed",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
} as const;

export const ORDER_STATUS_COLORS = {
  PLACED: "info",
  CONFIRMED: "warning",
  DELIVERED: "success",
  CANCELLED: "default",
} as const;

export function formatDateStr(dateStr: string): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

export function formatMinutes(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}
