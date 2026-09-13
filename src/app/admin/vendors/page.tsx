import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, users } from "@/db/schema";
import VendorsClient from "./VendorsClient";

export const metadata = { title: "Retailers" };

export default async function AdminVendorsPage() {
  const rows = await db
    .select({
      id: users.id,
      email: users.email,
      businessName: users.businessName,
      contactPerson: users.contactPerson,
      phone: users.phone,
      address: users.address,
      active: users.active,
      orderCount: sql<number>`count(${orders.id})::int`,
    })
    .from(users)
    .leftJoin(orders, eq(orders.vendorId, users.id))
    .where(eq(users.role, "VENDOR"))
    .groupBy(users.id)
    .orderBy(asc(users.businessName));

  return <VendorsClient vendors={rows} />;
}
