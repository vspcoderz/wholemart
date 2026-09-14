import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { products, settings, users } from "../src/db/schema";
import type { Category, Unit } from "../src/db/schema";

if (!process.env.DATABASE_URL) {
  process.loadEnvFile(".env.local");
}

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client);

const seedProducts: { name: string; category: Category; unit: Unit; price: number }[] = [
  { name: "Tomato", category: "LOCAL_VEG", unit: "KG", price: 30 },
  { name: "Onion", category: "LOCAL_VEG", unit: "KG", price: 28 },
  { name: "Potato", category: "LOCAL_VEG", unit: "KG", price: 25 },
  { name: "Green Chilli", category: "LOCAL_VEG", unit: "KG", price: 60 },
  { name: "Ladies Finger", category: "LOCAL_VEG", unit: "KG", price: 45 },
  { name: "Cabbage", category: "LOCAL_VEG", unit: "PIECE", price: 30 },
  { name: "Broccoli", category: "ENGLISH_VEG", unit: "KG", price: 180 },
  { name: "Apple (Shimla)", category: "FRUITS", unit: "KG", price: 160 },
  { name: "Banana (Robusta)", category: "FRUITS", unit: "KG", price: 40 },
  { name: "Grapes (Black Seedless)", category: "FRUITS", unit: "KG", price: 110 },
];

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { prepare: false });

  await sql`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'VENDOR',
    business_name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    address TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    name_mr TEXT,
    emoji TEXT,
    category TEXT NOT NULL,
    unit TEXT NOT NULL DEFAULT 'KG',
    price_per_unit NUMERIC(10,2) NOT NULL DEFAULT '0',
    image_url TEXT,
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`;

  await sql`CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    window_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'PLACED',
    admin_note TEXT,
    placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(vendor_id, window_date)
  )`;

  await sql`CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_name TEXT NOT NULL,
    unit TEXT NOT NULL,
    unit_price NUMERIC(10,2) NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    confirmed_quantity NUMERIC(10,2)
  )`;

  await sql`CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    window_start_minutes INTEGER NOT NULL DEFAULT 1380,
    window_end_minutes INTEGER NOT NULL DEFAULT 1320,
    timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    language TEXT NOT NULL DEFAULT 'mr',
    delivery_note TEXT
  )`;

  console.log("Tables created");

  await sql`INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING`;

  const adminPass = await bcrypt.hash("admin123", 10);
  const vendorPass = await bcrypt.hash("vendor123", 10);

  await sql`INSERT INTO users (email, password_hash, role, business_name, contact_person)
    VALUES ('admin@wholesale.local', ${adminPass}, 'ADMIN', 'Head Office', 'Admin')
    ON CONFLICT (email) DO NOTHING`;

  await sql`INSERT INTO users (email, password_hash, role, business_name, contact_person, phone, address)
    VALUES ('hotel@wholesale.local', ${vendorPass}, 'VENDOR', 'Sunrise Hotel', 'Ravi Kumar', '9876543210', '12, MG Road')
    ON CONFLICT (email) DO NOTHING`;

  await sql`INSERT INTO users (email, password_hash, role, business_name, contact_person, phone, address)
    VALUES ('vendor@wholesale.local', ${vendorPass}, 'VENDOR', 'Kumar Vegetable Store', 'Suresh Kumar', '9812345678', '45, Market Street')
    ON CONFLICT (email) DO NOTHING`;

  console.log("Users seeded");

  const existing = await sql`SELECT id FROM products LIMIT 1`;
  if (existing.length === 0) {
    for (let i = 0; i < seedProducts.length; i++) {
      const p = seedProducts[i];
      await sql`INSERT INTO products (name, category, unit, price_per_unit, sort_order)
        VALUES (${p.name}, ${p.category}, ${p.unit}, ${p.price.toFixed(2)}, ${i})`;
    }
    console.log(`Inserted ${seedProducts.length} products`);
  }

  console.log("Done. Admin: admin@wholesale.local / admin123");
  console.log("Vendor: hotel@wholesale.local / vendor123");
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
