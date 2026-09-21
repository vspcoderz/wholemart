import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, products, users } from "@/db/schema";
import { getSettings } from "@/lib/window";
import SettingsForm from "./SettingsForm";
import SettingsTabs from "./SettingsTabs";
import ProductsClient from "../products/ProductsClient";
import VendorsClient from "../vendors/VendorsClient";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage(props: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await props.searchParams;
  const cfg = await getSettings();

  const [productRows, vendorRows] = await Promise.all([
    db
      .select()
      .from(products)
      .orderBy(asc(products.category), asc(products.sortOrder), asc(products.name)),
    db
      .select({
        id: users.id,
        email: users.email,
        businessName: users.businessName,
        contactPerson: users.contactPerson,
        phone: users.phone,
        address: users.address,
        active: users.active,
        balance: users.balance,
        orderCount: sql<number>`count(${orders.id})::int`,
      })
      .from(users)
      .leftJoin(orders, eq(orders.vendorId, users.id))
      .where(eq(users.role, "VENDOR"))
      .groupBy(
        users.id,
        users.email,
        users.businessName,
        users.contactPerson,
        users.phone,
        users.address,
        users.active,
        users.balance,
      )
      .orderBy(asc(users.businessName)),
  ]);

  return (
    <SettingsTabs
      initialTab={tab === "products" || tab === "retailers" ? tab : "general"}
      general={
        <SettingsForm
          initial={{
            windowStartMinutes: cfg.windowStartMinutes,
            windowEndMinutes: cfg.windowEndMinutes,
            timezone: cfg.timezone,
            language: cfg.language,
            deliveryNote: cfg.deliveryNote ?? "",
          }}
        />
      }
      products={
        <ProductsClient
          products={productRows.map((p) => ({
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
      }
      retailers={
        <VendorsClient
          vendors={vendorRows.map((v) => ({ ...v, balance: Number(v.balance) }))}
        />
      }
    />
  );
}
