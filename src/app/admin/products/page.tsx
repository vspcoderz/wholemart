import { asc } from "drizzle-orm";
import { db } from "@/db";
import { products } from "@/db/schema";
import ProductsClient from "./ProductsClient";

export const metadata = { title: "Products" };

export default async function AdminProductsPage() {
  const rows = await db
    .select()
    .from(products)
    .orderBy(asc(products.category), asc(products.sortOrder), asc(products.name));

  return (
    <ProductsClient
      products={rows.map((p) => ({
        id: p.id,
        name: p.name,
        nameMr: p.nameMr,
        emoji: p.emoji,
        category: p.category,
        unit: p.unit,
        pricePerUnit: Number(p.pricePerUnit),
        active: p.active,
        description: p.description,
      }))}
    />
  );
}
