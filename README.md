# GreenGrocer — Wholesale Ordering (B2B PWA)

Mobile-first PWA where a wholesale supplier of vegetables, English (exotic)
vegetables and fruits takes orders from retailers (hotels, vendors, resellers)
inside a daily **ordering window**. All orders placed in the window are
fulfilled together and delivered after it closes. Payment is collected on
delivery (COD), and every order has a styled **PDF invoice**.

## Stack

- Next.js 16 (App Router, TypeScript, Turbopack)
- MUI (Material UI) — clean flat theme, light/dark
- Apple-HIG-informed design rules: >=44px touch targets, bottom tab nav on mobile, sentence-case copy, clear status feedback
- Drizzle ORM + Postgres (Supabase-ready — the local dev DB is plain Postgres in Docker)
- Auth.js (NextAuth v5) credentials auth, admin-created vendor accounts, role-based access via `proxy.ts` (Next 16's middleware)
- pdf-lib for invoice generation
- PWA: manifest + offline-shell service worker (`public/sw.js`), installable on phones

## Local development

```bash
# 1. Database (once)
docker run -d --name wvt-pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=wholesale -p 5433:5432 postgres:16-alpine

# 2. Env
cp .env.example .env.local   # defaults work with the Docker command above

# 3. Install + create tables, seed data and accounts in one step
npm install
npm run db:setup

# 4. Run (port 5000)
npm run dev
```

### Test accounts (from seed)

| Role   | Email                  | Password  |
| ------ | ---------------------- | --------- |
| Admin  | admin@wholesale.local  | admin123  |
| Vendor | hotel@wholesale.local  | vendor123 |
| Vendor | vendor@wholesale.local | vendor123 |

## How the ordering window works

- Default window: **11:00 PM -> 10:00 PM next day** (Asia/Kolkata) — the window
  the supplier named ("place order 12th 11pm to 13th 10pm, delivered after").
- Configurable in **Admin -> Settings** (times + timezone).
- While open, vendors browse, add to the order with +/- steppers (kg, g, dozen,
  piece, crate, box, bundle) and can **edit freely until the window closes**.
- After close, the order locks. Admin confirms, adjusts quantities (stock
  shortfalls) with a note the vendor sees, then marks Delivered when paid.
- The **Manifest** page shows the combined procurement list ("what do I need to
  buy?") grouped by product, plus per-retailer delivery lists — printable.

## Feature map

**Vendor PWA (mobile-first, `/vendor`)** — order window banner with live
countdown, category tabs + search, quantity steppers, cart review, order
history with status chips + admin notes, repeat order, invoice PDF download,
profile with saved delivery address, installable, offline shell.

**Admin (`/admin`, desktop/tablet optimized)** — dashboard (window status,
revenue, pending counts), orders per window date with item-level adjustments +
status flow (Placed -> Confirmed -> Delivered / Cancelled), printable delivery
manifest, product CRUD (price per unit, unit type, visibility), retailer CRUD
(create logins, disable), settings (window times, timezone, delivery note).

**Invoice PDF** — `/api/invoice/<orderId>`: A4, branded header, vendor details,
auto page-breaks for 40+ line items, adjusted quantities flagged, COD total.

## Deploying (Vercel + Supabase)

1. Create a Supabase project -> copy the **connection pooler** string
   (Transaction mode) into `DATABASE_URL`.
2. Push to GitHub -> import in Vercel -> set env vars: `DATABASE_URL`,
   `AUTH_SECRET` (generate with `openssl rand -base64 32`) and `SETUP_TOKEN`
   (any long random string).
3. `next build` automatically runs `npm run db:setup`, which creates tables,
   the settings row and the seed accounts/products if they don't exist yet.
   Alternatively hit `GET /api/setup?token=<SETUP_TOKEN>` after deploy.
4. Serve over HTTPS (Vercel default) — required for PWA install.

## Notes

- Change the seeded admin password before going live.
- Product prices are snapshotted into each order, so later price edits don't
  rewrite history.
- `proxy.ts` performs a lightweight role check at the edge; every server
  component and server action re-verifies the session server-side.
