/* CRUD smoke test — mirrors exactly what the server actions do, vs live DB.
 * Run: DATABASE_URL="postgresql://postgres:postgres@localhost:5433/wholesale" npx tsx /tmp/opencode/crud-smoke.ts
 * Uses fake window 2099-01-01 + __SMOKE__ rows; cleans up after itself.
 */
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "../src/db/index.js";
import {
  orderItems,
  orders,
  products,
  users,
} from "../src/db/schema.js";

const WIN = "2099-01-01";
const TAG = `__SMOKE_${Date.now()}__`;
let pass = 0;
let fail = 0;
function ok(name: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log(`  PASS ${name}`);
  } else {
    fail++;
    console.log(`  FAIL ${name}`);
  }
}

async function cleanup() {
  await db.delete(users).where(eq(users.email, `${TAG}@test.local`));
  await db.delete(products).where(eq(products.name, TAG));
  await db.delete(products).where(eq(products.name, `${TAG}_FK`));
}

await cleanup();

console.log("== products CRUD (saveProduct/toggleProduct/deleteProduct) ==");
const [p] = await db
  .insert(products)
  .values({
    name: TAG,
    category: "FRUITS",
    unit: "KG",
    pricePerUnit: "100.00",
    active: true,
  })
  .returning();
ok("create returns id", p.id > 0);
await db.update(products).set({ pricePerUnit: "120.50" }).where(eq(products.id, p.id));
const [p2] = await db.select().from(products).where(eq(products.id, p.id)).limit(1);
ok("update price persists", Number(p2.pricePerUnit) === 120.5);
await db.update(products).set({ active: false }).where(eq(products.id, p.id));
const [p3] = await db.select().from(products).where(eq(products.id, p.id)).limit(1);
ok("toggle active persists", p3.active === false);
await db.update(products).set({ active: true }).where(eq(products.id, p.id));

console.log("== vendors CRUD (saveVendor/toggleVendor/deleteVendor) ==");
const [v] = await db
  .insert(users)
  .values({
    email: `${TAG}@test.local`,
    passwordHash: await bcrypt.hash("test123", 10),
    role: "VENDOR",
    businessName: TAG,
    active: true,
  })
  .returning();
ok("create vendor returns id", v.id > 0);
ok("bcrypt roundtrip (login path)", await bcrypt.compare("test123", v.passwordHash));
const clash = await db
  .select({ id: users.id })
  .from(users)
  .where(eq(users.email, `${TAG}@test.local`))
  .limit(1);
ok("duplicate-email clash detected", clash.length === 1);
await db.update(users).set({ businessName: `${TAG}_RENAMED` }).where(eq(users.id, v.id));

console.log("== product delete with history (SET NULL snapshot) ==");
const [pfk] = await db
  .insert(products)
  .values({ name: `${TAG}_FK`, category: "LOCAL_VEG", unit: "KG", pricePerUnit: "10.00", active: true })
  .returning();
const [o1] = await db.insert(orders).values({ vendorId: v.id, windowDate: WIN }).returning();
await db.insert(orderItems).values({
  orderId: o1.id,
  productId: pfk.id,
  productName: pfk.name,
  unit: "KG",
  unitPrice: "10.00",
  quantity: "2",
});
await db.delete(products).where(eq(products.id, pfk.id));
const [survivor] = await db.select().from(orderItems).where(eq(orderItems.orderId, o1.id)).limit(1);
ok("item survives product delete", !!survivor);
ok("product_id nulled, snapshot kept", survivor.productId === null && survivor.productName === `${TAG}_FK`);

console.log("== one-order-per-vendor-per-window (upsert unique) ==");
let uniqueViolated = false;
try {
  await db.insert(orders).values({ vendorId: v.id, windowDate: WIN });
} catch (e) {
  // drizzle wraps the pg error: code lives on .cause
  const cause = (e as { cause?: { code?: string } })?.cause;
  uniqueViolated = cause?.code === "23505";
}
ok("duplicate (vendor, window) rejected with 23505", uniqueViolated);

console.log("== saveOrder semantics (replace items, DB prices) ==");
await db.delete(orderItems).where(eq(orderItems.orderId, o1.id));
await db.insert(orderItems).values([
  { orderId: o1.id, productId: p.id, productName: p.name, unit: p.unit, unitPrice: p2.pricePerUnit, quantity: "3" },
]);
const items1 = await db.select().from(orderItems).where(eq(orderItems.orderId, o1.id));
ok("items replaced (1 row)", items1.length === 1 && Number(items1[0].quantity) === 3);

console.log("== adjustOrderItems semantics (confirm + revert-to-null) ==");
await db.update(orderItems).set({ confirmedQuantity: "2.5" }).where(eq(orderItems.id, items1[0].id));
const [adj] = await db.select().from(orderItems).where(eq(orderItems.id, items1[0].id)).limit(1);
ok("confirmed qty stored", Number(adj.confirmedQuantity) === 2.5);
// revert-to-original clears override (the bugfix)
await db.update(orderItems).set({ confirmedQuantity: null }).where(eq(orderItems.id, items1[0].id));
const [rev] = await db.select().from(orderItems).where(eq(orderItems.id, items1[0].id)).limit(1);
ok("revert clears to NULL", rev.confirmedQuantity === null);

console.log("== finalizeBilling semantics (rate/unit/qty + PLACED->CONFIRMED, skip CANCELLED) ==");
const [o2] = await db
  .insert(orders)
  .values({ vendorId: v.id, windowDate: "2099-01-02", status: "CANCELLED" })
  .returning();
await db.insert(orderItems).values({
  orderId: o2.id, productId: p.id, productName: p.name, unit: "KG", unitPrice: "100.00", quantity: "1",
});
// billing writes
await db.update(orderItems).set({ unitPrice: "135.00", confirmedQuantity: "2", unit: "G" })
  .where(eq(orderItems.orderId, o1.id));
await db.update(orders).set({ status: "CONFIRMED", updatedAt: new Date() }).where(eq(orders.id, o1.id));
const [billed] = await db.select().from(orders).where(eq(orders.id, o1.id)).limit(1);
const [bItem] = await db.select().from(orderItems).where(eq(orderItems.orderId, o1.id)).limit(1);
ok("PLACED -> CONFIRMED", billed.status === "CONFIRMED");
ok("rate/unit/qty written", Number(bItem.unitPrice) === 135 && bItem.unit === "G" && Number(bItem.confirmedQuantity) === 2);
// cancelled order untouched
const [cOrder] = await db.select().from(orders).where(eq(orders.id, o2.id)).limit(1);
ok("CANCELLED skipped", cOrder.status === "CANCELLED");

console.log("== invoice math (coalesce confirmed/qty * price) ==");
const [inv] = await db
  .select({ total: sql<string>`coalesce(sum(coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity}) * ${orderItems.unitPrice}), 0)` })
  .from(orderItems)
  .where(eq(orderItems.orderId, o1.id));
ok("total = 2 * 135 = 270", Number(inv.total) === 270);

console.log("== vendor delete cascades orders+items ==");
await db.delete(users).where(eq(users.id, v.id));
const leftO = await db.select({ id: orders.id }).from(orders).where(eq(orders.vendorId, v.id));
const leftI = await db.select({ id: orderItems.id }).from(orderItems).where(eq(orderItems.orderId, o1.id));
ok("orders cascade-deleted", leftO.length === 0);
ok("items cascade-deleted", leftI.length === 0);

await db.delete(products).where(eq(products.id, p.id));
const [gone] = await db.select().from(products).where(eq(products.id, p.id)).limit(1);
ok("product delete removes row", !gone);
await cleanup();

console.log(`\nRESULT: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
