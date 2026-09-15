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
  mr: string;
  emoji: string;
  category: Category;
  unit: Unit;
  price: number;
};

const seedProducts: SeedProduct[] = [
  // Local vegetables
  { name: "Tomato", mr: "टोमॅटो", emoji: "🍅", category: "LOCAL_VEG", unit: "KG", price: 30 },
  { name: "Onion", mr: "कांदा", emoji: "🧅", category: "LOCAL_VEG", unit: "KG", price: 28 },
  { name: "Potato", mr: "बटाटा", emoji: "🥔", category: "LOCAL_VEG", unit: "KG", price: 25 },
  { name: "Green Chilli", mr: "हिरवी मिरची", emoji: "🌶️", category: "LOCAL_VEG", unit: "KG", price: 60 },
  { name: "Coriander Leaves", mr: "कोथिंबीर", emoji: "🌿", category: "LOCAL_VEG", unit: "BUNDLE", price: 10 },
  { name: "Curry Leaves", mr: "कढीपत्ता", emoji: "🍃", category: "LOCAL_VEG", unit: "BUNDLE", price: 5 },
  { name: "Brinjal (Small)", mr: "वांगे", emoji: "🍆", category: "LOCAL_VEG", unit: "KG", price: 40 },
  { name: "Ladies Finger", mr: "भेंडी", emoji: "🌾", category: "LOCAL_VEG", unit: "KG", price: 45 },
  { name: "Carrot (Ooty)", mr: "गाजर", emoji: "🥕", category: "LOCAL_VEG", unit: "KG", price: 50 },
  { name: "Beetroot", mr: "बीटरूट", emoji: "🍠", category: "LOCAL_VEG", unit: "KG", price: 35 },
  { name: "Cauliflower", mr: "फुलकोबी", emoji: "🥦", category: "LOCAL_VEG", unit: "PIECE", price: 35 },
  { name: "Cabbage", mr: "कोबी", emoji: "🥬", category: "LOCAL_VEG", unit: "PIECE", price: 30 },
  { name: "Drumstick", mr: "शेवग्याच्या शेंगा", emoji: "🌱", category: "LOCAL_VEG", unit: "KG", price: 70 },
  { name: "Banana Stem", mr: "केळीचा गाभा", emoji: "🌴", category: "LOCAL_VEG", unit: "PIECE", price: 40 },

  // English (exotic) vegetables
  { name: "Broccoli", mr: "ब्रोकली", emoji: "🥦", category: "ENGLISH_VEG", unit: "KG", price: 180 },
  { name: "Zucchini (Green)", mr: "झुकिनी", emoji: "🥒", category: "ENGLISH_VEG", unit: "KG", price: 160 },
  { name: "Colored Capsicum (Red/Yellow)", mr: "रंगीत ढोबळी मिरची", emoji: "🫑", category: "ENGLISH_VEG", unit: "KG", price: 140 },
  { name: "Cherry Tomato", mr: "चेरी टोमॅटो", emoji: "🍒", category: "ENGLISH_VEG", unit: "BOX", price: 220 },
  { name: "Asparagus", mr: "अस्पॅरॅगस", emoji: "🌿", category: "ENGLISH_VEG", unit: "BUNDLE", price: 250 },
  { name: "Celery", mr: "सेलेरी", emoji: "🥬", category: "ENGLISH_VEG", unit: "BUNDLE", price: 120 },
  { name: "Iceberg Lettuce", mr: "लेटूस", emoji: "🥗", category: "ENGLISH_VEG", unit: "PIECE", price: 110 },
  { name: "Baby Corn", mr: "बेबी कॉर्न", emoji: "🌽", category: "ENGLISH_VEG", unit: "KG", price: 150 },
  { name: "Button Mushroom", mr: "मशरूम", emoji: "🍄", category: "ENGLISH_VEG", unit: "KG", price: 200 },
  { name: "Jalapeño", mr: "जलपेनो", emoji: "🌶️", category: "ENGLISH_VEG", unit: "KG", price: 300 },
  { name: "Bell Pepper (Green)", mr: "ढोबळी मिरची (हिरवी)", emoji: "🫑", category: "ENGLISH_VEG", unit: "KG", price: 90 },

  // Fruits
  { name: "Banana (Robusta)", mr: "केळी", emoji: "🍌", category: "FRUITS", unit: "KG", price: 40 },
  { name: "Apple (Shimla)", mr: "सफरचंद", emoji: "🍎", category: "FRUITS", unit: "KG", price: 160 },
  { name: "Pomegranate", mr: "डाळिंब", emoji: "🔴", category: "FRUITS", unit: "KG", price: 140 },
  { name: "Papaya", mr: "पपई", emoji: "🧡", category: "FRUITS", unit: "KG", price: 35 },
  { name: "Watermelon", mr: "टरबूज", emoji: "🍉", category: "FRUITS", unit: "PIECE", price: 60 },
  { name: "Pineapple", mr: "अननस", emoji: "🍍", category: "FRUITS", unit: "PIECE", price: 70 },
  { name: "Grapes (Black Seedless)", mr: "द्राक्षे", emoji: "🍇", category: "FRUITS", unit: "KG", price: 110 },
  { name: "Orange (Nagpur)", mr: "संत्री", emoji: "🍊", category: "FRUITS", unit: "KG", price: 90 },
  { name: "Strawberry", mr: "स्ट्रॉबेरी", emoji: "🍓", category: "FRUITS", unit: "BOX", price: 250 },
  { name: "Kiwi", mr: "किवी", emoji: "🥝", category: "FRUITS", unit: "PIECE", price: 35 },
  { name: "Avocado", mr: "अवोकॅडो", emoji: "🥑", category: "FRUITS", unit: "PIECE", price: 120 },
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
