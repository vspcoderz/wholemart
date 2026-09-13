import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import CatalogClient from "./CatalogClient";
import { getWindowState } from "@/lib/window";

export const metadata = { title: "Order" };

export default async function VendorHomePage() {
  const win = await getWindowState();
  const rows = await db
    .select()
    .from(products)
    .where(eq(products.active, true))
    .orderBy(asc(products.category), asc(products.sortOrder), asc(products.name));

  const catalog = rows.map((p) => ({
    id: p.id,
    name: p.name,
    nameMr: p.nameMr,
    emoji: p.emoji,
    category: p.category,
    unit: p.unit,
    price: Number(p.pricePerUnit),
    imageUrl: p.imageUrl,
  }));

  return <CatalogClient catalog={catalog} windowOpen={win.open} />;
}
