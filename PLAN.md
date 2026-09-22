# UI Overhaul (Untitled UI) — PLAN

## Goal
Full MUI → Untitled UI React migration + admin overhaul (2026-09-22):
Reports (Orders/Outstanding sub-nav), Billing workbench, Accounting mirror,
billed-only Printing/Purchase, post-billing WhatsApp invoices.

## Decisions (locked with user)
- Full MUI rip-out (not incremental). Default purple brand (not green).
- Billed = CONFIRMED + DELIVERED everywhere. PLACED lives only in Billing.
- Billing hides finalized by default + "Show billed" toggle for re-edit.
- Post-finalize WhatsApp = wa.me deep-link (prefilled text) + PDF opened
  alongside (can't attach PDFs via wa.me). Phone from users.phone.
- Vendor PWA included in migration. 200-cap + "truncated" notice kept.

## Foundation (done)
- Tailwind v4.3 + @tailwindcss/postcss, styles/theme.css + typography.css
  (official Untitled tokens), Inter via next/font, .dark-mode class toggle
  in AppProviders. postcss.config.mjs, components.json.
- ~60 vendored primitives: src/components/{base,application,foundations},
  src/hooks, src/utils (eslint-ignored, do not edit).
- MUI/Emotion uninstalled. src/theme.ts deleted.

## Files rewritten (all Untitled, tsc+eslint clean, prod build green)
1. `src/app/admin/AdminShell.tsx` — sidebar (Statistics·Reports[Orders·
   Outstanding]·Billing·Purchase·Printing·Accounting·Settings) + mobile
   bottom nav + More sheet. Active state incl. ?tab= via useSearchParams.
2. `src/app/admin/orders/page.tsx` + `ReportsClient.tsx` (NEW, OrdersClient
   deleted) — ?from&to&retailers&tiers&tab; date range applies to BOTH tabs;
   retailer/rank tag multi-selects; per-row print; bulk print; Asia/Kolkata
   txn dates; table desktop / cards mobile.
3. `src/app/admin/billing/page.tsx` + `BillingClient.tsx` (BillingHeader
   deleted) — pending-only default + show-billed toggle; selection/edits
   re-sync on refresh (finalized drop out); confirm modal; post-finalize
   WhatsApp panel (wa.me + invoice PDF, no-phone badge); invoice hidden for
   PLACED; sticky finalize bar; phone passed from server.
4. `src/lib/actions/billing.ts` — all finalize writes in db.transaction.
5. `src/app/admin/accounting/AccountingClient.tsx` — same UX language;
   search incl. phone, rank multi, owing/settled, sorts; note input in
   modal (no more hardcoded notes); key-reset modal; Reports cross-link.
6. `src/app/admin/printing/page.tsx` + `PrintingClient.tsx` — billed-only +
   ?from&to&retailers&tiers; selection sync; per-row print; bulk bar with
   page estimate + >100 warning; bulk route 400s non-billed ids.
7. `src/app/admin/purchase/page.tsx` — CONFIRMED/DELIVERED only (was
   <>CANCELLED). `ManifestClient.tsx` rewritten (PrintButton folded in).
8. `src/app/admin/DashboardClient.tsx`, `orders/[id]/page.tsx` +
   `OrderEditor.tsx`, settings (`SettingsTabs/Form`), `ProductsClient`,
   `VendorsClient`, login, all loading.tsx, vendor PWA (BottomNav,
   WindowBanner, layout, Catalog, Cart, Orders, Transactions, Account,
   Profile — behavior identical, reskinned).
9. Icon-as-prop rule: NEVER pass @untitledui/icons components as props
   (iconLeading etc.) from server components — render as children instead.
   (Caught live: order detail page SSR hole.)

## Verification (done 2026-09-22, local DB + dev server)
- `npm run build` exit 0, all routes. `tsc` + `eslint src/` clean.
- Live curl-as-admin: /admin, /orders, /billing, /accounting, /printing,
  /purchase, /settings, /orders/10 all 200 with content markers.
- Live curl-as-vendor: /vendor, /cart, /transactions, /profile 200 + nav.
- Seeded PLACED order (Sunrise Hotel, 2026-09-21 window): billing shows it,
  totals ₹280+₹125=₹405 correct.
- Bulk guard: non-billed ids → 400 "Only billed orders…".
- Ring tokens: only ring-{primary,secondary,tertiary,error*,brand*} exist;
  success/warning rings must use ring-utility-green/yellow-200.

## Status: done, pending user manual pass
- Manual QA open: finalize billing → CHARGE/ledger → WhatsApp panel sends;
  collect/charge in Accounting; bulk PDF page-per-order; mobile More sheet;
  vendor order → billing → delivery flow on a real phone.
- Dev scratch data: PLACED order #11 (Sunrise Hotel, 2026-09-21) left in
  local DB for the user to finalize and test with.
