"use client";

import Link from "next/link";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { ORDER_STATUS_LABELS, inr } from "@/lib/format";
import { formatDateStr, formatMinutes } from "@/lib/format";

export type DayRevenue = { windowDate: string; orders: number; revenue: number };
export type TopProduct = { name: string; qty: number; revenue: number };
export type TopRetailer = {
  name: string;
  orders: number;
  revenue: number;
  balance: number;
};
export type RecentOrder = {
  id: number;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  windowDate: string;
  vendorName: string;
  total: number;
  itemCount: number;
};

const STATUS_BADGE: Record<RecentOrder["status"], "blue" | "warning" | "success" | "gray"> = {
  PLACED: "blue",
  CONFIRMED: "warning",
  DELIVERED: "success",
  CANCELLED: "gray",
};

export default function DashboardClient({
  windowStartMinutes,
  windowEndMinutes,
  vendorCount,
  productCount,
  totalOrders,
  billedOrders,
  totalRevenue,
  outstanding,
  dayRevenue,
  topProducts,
  topRetailers,
  recentOrders,
}: {
  windowStartMinutes: number;
  windowEndMinutes: number;
  vendorCount: number;
  productCount: number;
  totalOrders: number;
  billedOrders: number;
  totalRevenue: number;
  outstanding: number;
  dayRevenue: DayRevenue[];
  topProducts: TopProduct[];
  topRetailers: TopRetailer[];
  recentOrders: RecentOrder[];
}) {
  const stats = [
    { label: "Total revenue", value: inr(totalRevenue), href: "/admin/orders" },
    { label: "Outstanding dues", value: inr(outstanding), href: "/admin/accounting" },
    { label: "All orders", value: `${totalOrders} (${billedOrders} billed)`, href: "/admin/orders" },
    { label: "Retailers", value: String(vendorCount), href: "/admin/settings?tab=retailers" },
    { label: "Active products", value: String(productCount), href: "/admin/settings?tab=products" },
  ];

  const maxDay = Math.max(1, ...dayRevenue.map((d) => d.revenue));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-display-xs font-semibold text-primary">Statistics</h1>
        <p className="text-sm text-tertiary">
          Ordering {formatMinutes(windowStartMinutes)} – {formatMinutes(windowEndMinutes)} ·
          deliveries go out after close.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary outline-focus-ring transition-colors hover:bg-primary_hover focus-visible:outline-2"
          >
            <p className="text-xs text-quaternary">{s.label}</p>
            <p className="mt-1 text-md font-semibold text-primary">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="grid items-stretch gap-4 lg:grid-cols-2">
        <section className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
          <h2 className="text-md font-semibold text-primary">Revenue — last 7 days</h2>
          {dayRevenue.length === 0 ? (
            <p className="mt-2 text-sm text-tertiary">No sales yet.</p>
          ) : (
            <div className="mt-3 flex flex-col gap-2.5">
              {[...dayRevenue].reverse().map((d) => (
                <div key={d.windowDate}>
                  <div className="flex justify-between gap-2">
                    <p className="text-sm text-tertiary">
                      {formatDateStr(d.windowDate)} · {d.orders} orders
                    </p>
                    <p className="text-sm font-semibold text-primary">{inr(d.revenue)}</p>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-quaternary">
                    <div
                      className="h-full rounded-full bg-brand-solid"
                      style={{ width: `${Math.round((d.revenue / maxDay) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
          <h2 className="text-md font-semibold text-primary">Top products (by revenue)</h2>
          {topProducts.length === 0 ? (
            <p className="mt-2 text-sm text-tertiary">No sales yet.</p>
          ) : (
            <ul className="mt-1">
              {topProducts.map((p, i) => (
                <li
                  key={p.name}
                  className="flex items-center justify-between gap-2 border-b border-secondary py-2 last:border-0"
                >
                  <p className="min-w-0 truncate text-sm font-semibold text-primary">
                    {i + 1}. {p.name}
                    <span className="ml-1.5 font-normal text-tertiary">{p.qty} sold</span>
                  </p>
                  <p className="shrink-0 text-sm font-semibold text-primary">{inr(p.revenue)}</p>
                </li>
              ))}
            </ul>
          )}
          <h2 className="mt-4 text-md font-semibold text-primary">Top retailers (by purchases)</h2>
          {topRetailers.length === 0 ? (
            <p className="mt-2 text-sm text-tertiary">No sales yet.</p>
          ) : (
            <ul className="mt-1">
              {topRetailers.map((r) => (
                <li key={r.name} className="flex items-center justify-between gap-2 py-1.5">
                  <p className="min-w-0 truncate text-sm text-secondary">
                    {r.name}
                    <span className="ml-1.5 text-tertiary">
                      {r.orders} orders
                      {r.balance > 0.004 && ` · owes ${inr(r.balance)}`}
                    </span>
                  </p>
                  <p className="shrink-0 text-sm font-semibold text-primary">{inr(r.revenue)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-md font-semibold text-primary">Recent orders</h2>
        <Button size="sm" color="link-color" href="/admin/orders">
          Full reports
        </Button>
      </div>

      {recentOrders.length === 0 ? (
        <p className="rounded-xl bg-primary p-6 text-center text-sm text-tertiary ring-1 ring-secondary">
          No orders yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {recentOrders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/orders/${o.id}`}
                className="flex items-center justify-between gap-2 rounded-xl bg-primary p-3.5 shadow-xs ring-1 ring-secondary outline-focus-ring transition-colors hover:bg-primary_hover focus-visible:outline-2"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-primary">
                    {o.vendorName}
                  </span>
                  <span className="mt-0.5 block text-sm text-tertiary">
                    {formatDateStr(o.windowDate)} · {o.itemCount} items · {inr(o.total)}
                  </span>
                </span>
                <Badge size="sm" type="pill-color" color={STATUS_BADGE[o.status]}>
                  {ORDER_STATUS_LABELS[o.status]}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
