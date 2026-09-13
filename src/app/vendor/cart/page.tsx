import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import { getWindowState } from "@/lib/window";
import CartClient from "./CartClient";

export const metadata = { title: "My order" };

export default async function CartPage() {
  const win = await getWindowState();
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.name));

  // The cart may hold items the admin just deactivated — keep them visible
  // so the vendor can remove them, flagged as unavailable.
  const catalog = rows.map((p) => ({
    id: p.id,
    name: p.name,
    nameMr: p.nameMr,
    emoji: p.emoji,
    unit: p.unit,
    price: Number(p.pricePerUnit),
  }));

  return <CartClient catalog={catalog} windowOpen={win.open} />;
}
