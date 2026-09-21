import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["ADMIN", "VENDOR"]);

// Retailer ranking: VIP first, Tier 1–5 after. Used for billing priority
// and sorting across admin lists.
export const tierEnum = pgEnum("retailer_tier", [
  "VIP",
  "TIER_1",
  "TIER_2",
  "TIER_3",
  "TIER_4",
  "TIER_5",
]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: roleEnum("role").notNull().default("VENDOR"),
  businessName: text("business_name").notNull(),
  contactPerson: text("contact_person"),
  phone: text("phone"),
  address: text("address"),
  // Outstanding amount the retailer owes (positive = owes us).
  // Bumped by billing CHARGE rows, reduced by PAYMENT rows.
  balance: numeric("balance", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  tier: tierEnum("tier").notNull().default("TIER_3"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const categoryEnum = pgEnum("category", [
  "LOCAL_VEG",
  "ENGLISH_VEG",
  "FRUITS",
]);

export const unitEnum = pgEnum("unit", [
  "KG",
  "G",
  "DOZEN",
  "PIECE",
  "CRATE",
  "BOX",
  "BUNDLE",
]);

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  nameMr: text("name_mr"), // Marathi display name
  emoji: text("emoji"), // per-product icon shown when no image
  category: categoryEnum("category").notNull(),
  unit: unitEnum("unit").notNull().default("KG"),
  pricePerUnit: numeric("price_per_unit", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  imageUrl: text("image_url"),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const orderStatusEnum = pgEnum("order_status", [
  "PLACED",
  "CONFIRMED",
  "DELIVERED",
  "CANCELLED",
]);

export const orders = pgTable(
  "orders",
  {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The date the window opened (orders placed 11 PM on the 12th belong to the 12th)
    windowDate: text("window_date").notNull(), // YYYY-MM-DD
    status: orderStatusEnum("status").notNull().default("PLACED"),
    adminNote: text("admin_note"),
    placedAt: timestamp("placed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [unique("orders_vendor_window_unique").on(t.vendorId, t.windowDate)],
);

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .notNull()
    .references(() => orders.id, { onDelete: "cascade" }),
  productId: integer("product_id").references(() => products.id, {
    onDelete: "set null",
  }), // nullable: deleting a product keeps historical items (name/unit/price are snapshotted)
  productName: text("product_name").notNull(), // snapshot, survives product edits
  unit: unitEnum("unit").notNull(),
  unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull(),
  confirmedQuantity: numeric("confirmed_quantity", {
    precision: 10,
    scale: 2,
  }), // admin-adjusted (stock shortfall etc.)
});

// Singleton row (id = 1) holding client-wide settings
export const settings = pgTable("settings", {
  id: integer("id").primaryKey().default(1),
  windowStartMinutes: integer("window_start_minutes").notNull().default(1380), // 23:00
  windowEndMinutes: integer("window_end_minutes").notNull().default(1320), // 22:00 next day
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  language: text("language").notNull().default("mr"), // vendor UI language: "mr" | "en"
  deliveryNote: text("delivery_note"),
});

export const transactionTypeEnum = pgEnum("transaction_type", [
  "CHARGE", // billing finalized — increases what the retailer owes
  "PAYMENT", // money received from the retailer — reduces what they owe
  "ADJUSTMENT", // manual correction, signed amount
]);

// Money ledger per retailer. `users.balance` caches the running total.
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  orderId: integer("order_id").references(() => orders.id, {
    onDelete: "set null",
  }),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Product = typeof products.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Settings = typeof settings.$inferSelect;
export type Tier = (typeof tierEnum.enumValues)[number];
export type Category = (typeof categoryEnum.enumValues)[number];
export type Unit = (typeof unitEnum.enumValues)[number];
