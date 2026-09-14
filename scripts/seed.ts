import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { products, settings, users } from "../src/db/schema";
import type { Category, Unit } from "../src/db/schema";

if (!process.env.DATABASE_URL) {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // fall back to environment
  }
}

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
const db = drizzle(client);

type SeedProduct = {
  name: string;
  category: Category;
  unit: Unit;
  price: number;
};

const seedProducts: SeedProduct[] = [
  // Local vegetables
  { name: "Tomato", category: "LOCAL_VEG", unit: "KG", price: 30 },
  { name: "Onion", category: "LOCAL_VEG", unit: "KG", price: 28 },
  { name: "Potato", category: "LOCAL_VEG", unit: "KG", price: 25 },
  { name: "Green Chilli", category: "LOCAL_VEG", unit: "KG", price: 60 },
  { name: "Coriander Leaves", category: "LOCAL_VEG", unit: "BUNDLE", price: 10 },
  { name: "Curry Leaves", category: "LOCAL_VEG", unit: "BUNDLE", price: 5 },
  { name: "Brinjal (Small)", category: "LOCAL_VEG", unit: "KG", price: 40 },
  { name: "Ladies Finger", category: "LOCAL_VEG", unit: "KG", price: 45 },
  { name: "Carrot (Ooty)", category: "LOCAL_VEG", unit: "KG", price: 50 },
  { name: "Beetroot", category: "LOCAL_VEG", unit: "KG", price: 35 },
  { name: "Cauliflower", category: "LOCAL_VEG", unit: "PIECE", price: 35 },
  { name: "Cabbage", category: "LOCAL_VEG", unit: "PIECE", price: 30 },
  { name: "Drumstick", category: "LOCAL_VEG", unit: "KG", price: 70 },
  { name: "Banana Stem", category: "LOCAL_VEG", unit: "PIECE", price: 40 },

  // English (exotic) vegetables
  { name: "Broccoli", category: "ENGLISH_VEG", unit: "KG", price: 180 },
  { name: "Zucchini (Green)", category: "ENGLISH_VEG", unit: "KG", price: 160 },
  { name: "Colored Capsicum (Red/Yellow)", category: "ENGLISH_VEG", unit: "KG", price: 140 },
  { name: "Cherry Tomato", category: "ENGLISH_VEG", unit: "BOX", price: 220 },
  { name: "Asparagus", category: "ENGLISH_VEG", unit: "BUNDLE", price: 250 },
  { name: "Celery", category: "ENGLISH_VEG", unit: "BUNDLE", price: 120 },
  { name: "Iceberg Lettuce", category: "ENGLISH_VEG", unit: "PIECE", price: 110 },
  { name: "Baby Corn", category: "ENGLISH_VEG", unit: "KG", price: 150 },
  { name: "Button Mushroom", category: "ENGLISH_VEG", unit: "KG", price: 200 },
  { name: "Jalapeño", category: "ENGLISH_VEG", unit: "KG", price: 300 },
  { name: "Bell Pepper (Green)", category: "ENGLISH_VEG", unit: "KG", price: 90 },

  // Fruits
  { name: "Banana (Robusta)", category: "FRUITS", unit: "KG", price: 40 },
  { name: "Apple (Shimla)", category: "FRUITS", unit: "KG", price: 160 },
  { name: "Pomegranate", category: "FRUITS", unit: "KG", price: 140 },
  { name: "Papaya", category: "FRUITS", unit: "KG", price: 35 },
  { name: "Watermelon", category: "FRUITS", unit: "PIECE", price: 60 },
  { name: "Pineapple", category: "FRUITS", unit: "PIECE", price: 70 },
  { name: "Grapes (Black Seedless)", category: "FRUITS", unit: "KG", price: 110 },
  { name: "Orange (Nagpur)", category: "FRUITS", unit: "KG", price: 90 },
  { name: "Strawberry", category: "FRUITS", unit: "BOX", price: 250 },
  { name: "Kiwi", category: "FRUITS", unit: "PIECE", price: 35 },
  { name: "Avocado", category: "FRUITS", unit: "PIECE", price: 120 },
];

async function main() {
  console.log("Seeding…");

  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();

  const adminPass = await bcrypt.hash("admin123", 10);
  const vendorPass = await bcrypt.hash("vendor123", 10);

  await db
    .insert(users)
    .values({
      email: "admin@wholesale.local",
      passwordHash: adminPass,
      role: "ADMIN",
      businessName: "Head Office",
      contactPerson: "Admin",
    })
    .onConflictDoNothing();

  await db
    .insert(users)
    .values([
      {
        email: "hotel@wholesale.local",
        passwordHash: vendorPass,
        role: "VENDOR" as const,
        businessName: "Sunrise Hotel",
        contactPerson: "Ravi Kumar",
        phone: "9876543210",
        address: "12, MG Road",
      },
      {
        email: "vendor@wholesale.local",
        passwordHash: vendorPass,
        role: "VENDOR" as const,
        businessName: "Kumar Vegetable Store",
        contactPerson: "Suresh Kumar",
        phone: "9812345678",
        address: "45, Market Street",
      },
    ])
    .onConflictDoNothing();

  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length === 0) {
    await db.insert(products).values(
      seedProducts.map((p, i) => ({
        name: p.name,
        category: p.category,
        unit: p.unit,
        pricePerUnit: p.price.toFixed(2),
        sortOrder: i,
      })),
    );
    console.log(`Inserted ${seedProducts.length} products`);
  }

  console.log("Done. Admin: admin@wholesale.local / admin123");
  console.log("Vendor: hotel@wholesale.local / vendor123");
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
