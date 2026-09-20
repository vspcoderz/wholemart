# Billing + Dynamic Pricing + Admin Perf — PLAN

## Goal
Daily-dynamic pricing with a Billing tab in admin: select particular orders,
set per-line rate/qty/unit, finalize, track billed vs pending. Filters/sorts
across admin, 15s polling, skeletons/Suspense, cache revalidation.

## Decisions (from user)
- `products.pricePerUnit` + `unit` = fallback default (vendor catalog unchanged).
- Billing rate is set per selected orders, per product line.
- After billing: 4 status cards (total / pending / billed / day value).
- Bills as PDF for admin + vendors = existing `/api/invoice/[id]` (vendors
  already have Invoice PDF in My Orders). Billing links it per order.
- Manifest page stays, nav relabelled **Accounting** (same href).
- Polling 15s, paused when tab hidden.

## Approach — no DB migration
- Finalize writes `order_items.unitPrice / confirmedQuantity / unit` and flips
  `PLACED → CONFIRMED` (= billed). Cards derive from status + totals.
- Unit switch kg↔g auto-converts qty (×1000); others relabel only.

## Files touched
1. `src/lib/polling.ts` (NEW) — `usePollingRefresh(15000)` hook.
2. `src/lib/actions/billing.ts` (NEW) — `finalizeBilling()` server action.
3. `src/app/admin/billing/page.tsx` (NEW) — server: window date, orders+items,
   4 cards, streams `BillingClient` in Suspense.
4. `src/app/admin/billing/BillingClient.tsx` (NEW) — checkboxes, vendor search,
   status filter, product search + category filter + sorting, editable
   price/qty/unit, finalize, invoice links, 15s polling.
5. `src/app/admin/billing/loading.tsx` (NEW) — skeleton.
6. `src/app/admin/orders/OrdersClient.tsx` (NEW) + `page.tsx` (EDIT) — search,
   status filter, sort, polling. `loading.tsx` (NEW) skeleton.
7. `src/app/admin/AdminShell.tsx` (EDIT) — add Billing nav, Manifest→Accounting.
8. `src/app/admin/products/ProductsClient.tsx` (EDIT) — search + category +
   active filter + price/name sort.
9. `src/app/admin/vendors/VendorsClient.tsx` (EDIT) — search + active filter +
   name/orders sort.
10. `src/app/admin/manifest/page.tsx` (EDIT, minor) — title "Accounting".

## Verification
- `npx tsc --noEmit` clean.
- `npx eslint` on touched files clean.
- Manual: open `/admin/billing`, select orders, edit rate, finalize → order
  shows CONFIRMED, invoice PDF reflects new rate; filters/sorts work; network
  tab shows refresh every 15s only when tab visible.

## Status: done
- tsc + eslint clean. `scripts/crud-smoke.mts` 19/19 PASS vs live DB.
- Manual check still open: log in as admin, exercise /admin/billing finalize → invoice PDF.
