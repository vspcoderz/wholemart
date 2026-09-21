# Admin Overhaul — PLAN

## Goal
Reshape admin IA + vendor money visibility, per user request (2026-09-21):
continuous ordering, History/Reports, Purchase, Statistics, Printing (bulk PDF),
real Accounting with retailer balances + ledger, Settings absorbs Products/Retailers.

## Decisions
- `users.balance` NUMERIC(10,2) default 0 = outstanding owed (positive = owes us).
  Increased by CHARGE rows on billing finalize, decreased by PAYMENT rows.
- New `transactions` table: vendorId FK cascade, type CHARGE|PAYMENT|ADJUSTMENT,
  amount, orderId nullable, note, createdAt. Ledger = truth; balance = cached sum.
- Ordering window: always OPEN. `getWindowState()` returns open:true,
  windowDate = today (tz), closesAt = next midnight. Settings time fields stay
  (harmless) but no longer gate anything; vendor saveOrder keeps its guard
  (always passes).
- Nav (7): Statistics `/admin` · History `/admin/orders` · Billing
  `/admin/billing` · Purchase `/admin/purchase` (moved from manifest) ·
  Printing `/admin/printing` · Accounting `/admin/accounting` ·
  Settings `/admin/settings` (embeds Products + Retailers tabs).
- `/admin/manifest` → redirect to `/admin/purchase`. `/admin/products`,
  `/admin/vendors` → redirect to `/admin/settings?tab=…`.
- Invoice PDF drawing extracted to `src/lib/invoice-pdf.ts`
  (`drawInvoicePage(pdf, fonts, order, vendor, items)`); single + bulk routes share it.
  Bulk: `/api/invoices/bulk?ids=1,2,3` — one PDF, each order starts on a fresh page.
- Vendor: BottomNav Order|Cart|History|Account|Profile. `/vendor/account` shows
  balance + ledger. `/vendor/orders` keeps list (label History via i18n).
- Mobile admin: bottom nav = Home·History·Billing·Printing·More; More opens a
  sheet with Purchase·Accounting·Settings·Sign out. Desktop drawer drops
  "Vendor view", keeps Sign out.
- Perf: billing page single items query (kill per-order N+1); history/printing
  lists capped (200) with date filter; history poll 30s, billing 15s.

## Files touched
1. `src/db/schema.ts` — users.balance, transactions table + types.
2. `scripts/setup.ts` — create transactions table, ALTER users ADD balance.
3. `src/lib/window.ts` — always-open.
4. `src/lib/invoice-pdf.ts` (NEW) — extracted invoice renderer.
5. `src/app/api/invoice/[id]/route.ts` (EDIT) — use shared renderer.
6. `src/app/api/invoices/bulk/route.ts` (NEW).
7. `src/lib/actions/billing.ts` (EDIT) — ledger CHARGE + balance bump per vendor.
8. `src/lib/actions/accounting.ts` (NEW) — recordPayment/recordAdjustment.
9. `src/lib/actions/admin.ts` (EDIT) — revalidate /admin/settings, /admin/purchase.
10. `src/app/admin/AdminShell.tsx` (REWRITE nav).
11. `src/app/admin/page.tsx` + `DashboardClient.tsx` (REWRITE → Statistics).
12. `src/app/admin/orders/page.tsx` + `OrdersClient.tsx` (→ History: all orders + ledger).
13. `src/app/admin/manifest/` → `src/app/admin/purchase/` (git mv + retitle + revalidate paths).
14. `src/app/admin/printing/page.tsx` + `PrintingClient.tsx` (NEW).
15. `src/app/admin/accounting/page.tsx` + `AccountingClient.tsx` (NEW).
16. `src/app/admin/settings/page.tsx` (EDIT — tabs embed Products/Vendors clients).
17. `src/app/admin/products/page.tsx`, `src/app/admin/vendors/page.tsx` (→ redirects).
18. `src/app/admin/vendors/VendorsClient.tsx` (EDIT — balance column).
19. `src/components/BottomNav.tsx`, `src/lib/i18n.tsx` (vendor History/Account labels).
20. `src/app/vendor/account/page.tsx` (NEW) + orders page tweak.

## Verification
- `npm run db:setup` migrates live DB (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
- `npx tsc --noEmit` clean; `npx eslint` on touched files clean.
- Manual: finalize billing → balance rises + CHARGE visible in admin Accounting
  and vendor Account; record payment → balance falls; bulk PDF has N order pages;
  mobile shows More + sign out; ordering never shows closed.

## Status: done (pending live-DB migration + manual pass)
- `npx tsc --noEmit` clean. `npx eslint src/` clean (0 errors, 0 warnings).
- `npx next build` compiles + typechecks; prerender blocked only by no local DB
  (ECONNREFUSED :5433, same for old pages — environmental, not a code error).
- `npm run db:setup` (adds balance + transactions) must run where the live DB is
  reachable — runs automatically in `npm run build` on deploy.
- Manual check still open: finalize billing → balance/CHARGE in Accounting +
  vendor Account; record payment; bulk PDF page-per-order; mobile More + sign
  out; ordering never closed.
