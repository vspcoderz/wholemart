"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MessageChatCircle, Printer } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import type { Category, Tier, Unit } from "@/db/schema";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  ORDER_STATUS_LABELS,
  TIER_LABELS,
  TIER_RANK,
  TIERS,
  UNITS,
  UNIT_LABELS,
  formatDateStr,
  inr,
} from "@/lib/format";
import { usePollingRefresh } from "@/lib/polling";
import { finalizeBilling } from "@/lib/actions/billing";
import { cx } from "@/utils/cx";

export type BillingItem = {
  id: number;
  productId: number | null;
  productName: string;
  category: Category | null;
  unit: Unit;
  unitPrice: number;
  quantity: number;
  confirmedQuantity: number | null;
};

export type BillingOrder = {
  id: number;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  vendorName: string;
  phone: string | null;
  tier: Tier;
  items: BillingItem[];
};

type LineEdit = { price: string; qty: string; unit: Unit };

const num = (s: string, fallback: number) => {
  const v = Number(s);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

/** Auto-convert qty when switching between weight units; relabel otherwise. */
function convertQty(qty: number, from: Unit, to: Unit): number {
  if (from === to) return qty;
  if (from === "KG" && to === "G") return qty * 1000;
  if (from === "G" && to === "KG") return qty / 1000;
  return qty;
}

function invoiceNo(id: number, windowDate: string) {
  return `GG-${windowDate.replaceAll("-", "")}-${String(id).padStart(4, "0")}`;
}

/** Normalize an Indian retailer phone number for wa.me links. */
function waNumber(phone: string | null): string | null {
  if (!phone) return null;
  const d = phone.replace(/\D/g, "").replace(/^0+/, "");
  if (d.length === 10) return `91${d}`;
  if (d.length === 12 && d.startsWith("91")) return d;
  return d.length >= 10 ? d : null;
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

type FinalizedInfo = { id: number; vendorName: string; phone: string | null; total: number };

const STATUS_BADGE: Record<BillingOrder["status"], "blue" | "warning" | "success" | "gray"> = {
  PLACED: "blue",
  CONFIRMED: "warning",
  DELIVERED: "success",
  CANCELLED: "gray",
};

export default function BillingClient({
  windowDate,
  orders,
}: {
  windowDate: string;
  orders: BillingOrder[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  usePollingRefresh(15000);

  // Preselect unbilled (PLACED) orders — the daily workflow.
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(orders.filter((o) => o.status === "PLACED").map((o) => o.id)),
  );
  const [edits, setEdits] = useState<Record<number, LineEdit>>(() =>
    Object.fromEntries(
      orders.flatMap((o) =>
        o.items.map((i) => [
          i.id,
          {
            price: String(i.unitPrice),
            qty: String(i.confirmedQuantity ?? i.quantity),
            unit: i.unit,
          },
        ]),
      ),
    ),
  );

  // Keep selection + draft edits in sync when fresh orders arrive (polling /
  // post-finalize refresh). Finalized orders drop out of the selection so
  // they never linger checked — the "already billed" confusion is gone.
  // Sync-on-prop-change by design: fires only when server data refreshes.
  /* eslint-disable react-hooks/set-state-in-effect -- sync-on-prop-change by design */
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set<number>();
      for (const id of prev) {
        const o = orders.find((x) => x.id === id);
        if (o && o.status === "PLACED") next.add(id);
      }
      return next;
    });
    setEdits((prev) => {
      const next = { ...prev };
      for (const o of orders) {
        for (const i of o.items) {
          next[i.id] ??= {
            price: String(i.unitPrice),
            qty: String(i.confirmedQuantity ?? i.quantity),
            unit: i.unit,
          };
        }
      }
      return next;
    });
  }, [orders]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const [showBilled, setShowBilled] = useState(false);
  const [vendorQuery, setVendorQuery] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [orderSort, setOrderSort] = useState("tier");
  const [productQuery, setProductQuery] = useState("");
  const [catFilter, setCatFilter] = useState("ALL");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [finalized, setFinalized] = useState<FinalizedInfo[] | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const editOf = (i: BillingItem): LineEdit =>
    edits[i.id] ?? {
      price: String(i.unitPrice),
      qty: String(i.confirmedQuantity ?? i.quantity),
      unit: i.unit,
    };
  const lineValue = (i: BillingItem) => {
    const e = editOf(i);
    return num(e.qty, 0) * num(e.price, 0);
  };
  const orderValue = (o: BillingOrder) => o.items.reduce((s, i) => s + lineValue(i), 0);

  const live = useMemo(() => orders.filter((o) => o.status !== "CANCELLED"), [orders]);
  const pendingOrders = useMemo(() => live.filter((o) => o.status === "PLACED"), [live]);
  const billedOrders = useMemo(() => live.filter((o) => o.status !== "PLACED"), [live]);
  const pendingValue = pendingOrders.reduce((s, o) => s + orderValue(o), 0);
  const billedValue = billedOrders.reduce((s, o) => s + orderValue(o), 0);

  const visibleOrders = useMemo(() => {
    const q = vendorQuery.trim().toLowerCase();
    const rows = live.filter(
      (o) =>
        (showBilled || o.status === "PLACED") &&
        (tierFilter === "ALL" || o.tier === tierFilter) &&
        (q === "" || o.vendorName.toLowerCase().includes(q)),
    );
    rows.sort((a, b) => {
      if (orderSort === "vendor") return a.vendorName.localeCompare(b.vendorName);
      if (orderSort === "total") return orderValue(b) - orderValue(a);
      return TIER_RANK[a.tier] - TIER_RANK[b.tier] || a.vendorName.localeCompare(b.vendorName);
    });
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, showBilled, vendorQuery, tierFilter, orderSort, edits]);

  const selectedOrders = useMemo(
    () => orders.filter((o) => selected.has(o.id) && o.status !== "CANCELLED"),
    [orders, selected],
  );

  // Product aggregation across the selection (rate editable per product).
  const summary = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    const map = new Map<
      string,
      { name: string; category: Category | null; unit: Unit; qty: number; prices: Set<number> }
    >();
    for (const o of selectedOrders) {
      for (const i of o.items) {
        const e = editOf(i);
        const key = `${i.productName}|||${e.unit}`;
        const row = map.get(key) ?? {
          name: i.productName,
          category: i.category,
          unit: e.unit,
          qty: 0,
          prices: new Set<number>(),
        };
        row.qty += num(e.qty, 0);
        row.prices.add(num(e.price, 0));
        map.set(key, row);
      }
    }
    let rows = [...map.entries()].map(([key, r]) => ({
      key,
      ...r,
      rate: r.prices.size === 1 ? [...r.prices][0] : null, // null = mixed
    }));
    rows = rows.filter(
      (r) =>
        (catFilter === "ALL" ||
          (catFilter === "__NONE__" ? r.category === null : r.category === catFilter)) &&
        (q === "" || r.name.toLowerCase().includes(q)),
    );
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "qty") return (a.qty - b.qty) * dir;
      return (a.qty * (a.rate ?? 0) - b.qty * (b.rate ?? 0)) * dir;
    });
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrders, productQuery, catFilter, sortKey, sortDir, edits]);

  const grandTotal = selectedOrders.reduce((s, o) => s + orderValue(o), 0);

  function editOfById(itemId: number): LineEdit {
    return edits[itemId] ?? { price: "0", qty: "0", unit: "KG" as Unit };
  }
  function setLine(itemId: number, patch: Partial<LineEdit>) {
    setEdits((p) => ({ ...p, [itemId]: { ...editOfById(itemId), ...patch } }));
  }

  function setProductRate(key: string, rate: string) {
    const v = Number(rate.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(v) || v < 0) return;
    setEdits((p) => {
      const next = { ...p };
      for (const o of selectedOrders) {
        for (const i of o.items) {
          const e = next[i.id] ?? {
            price: String(i.unitPrice),
            qty: String(i.confirmedQuantity ?? i.quantity),
            unit: i.unit,
          };
          if (`${i.productName}|||${e.unit}` === key) {
            next[i.id] = { ...e, price: String(v) };
          }
        }
      }
      return next;
    });
  }

  function toggle(id: number) {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function doFinalize() {
    setConfirmOpen(false);
    const billable = selectedOrders;
    const lines = billable.flatMap((o) =>
      o.items.map((i) => {
        const e = editOf(i);
        return {
          itemId: i.id,
          orderId: o.id,
          unitPrice: num(e.price, i.unitPrice),
          quantity: num(e.qty, i.confirmedQuantity ?? i.quantity),
          unit: e.unit,
        };
      }),
    );
    const totals = new Map(billable.map((o) => [o.id, orderValue(o)]));
    startTransition(async () => {
      const res = await finalizeBilling(
        windowDate,
        billable.map((o) => o.id),
        lines,
      );
      if (res.ok) {
        setFinalized(
          billable.map((o) => ({
            id: o.id,
            vendorName: o.vendorName,
            phone: o.phone,
            total: totals.get(o.id) ?? 0,
          })),
        );
        setSelected(new Set());
        setToast({ msg: `Billing finalized for ${res.billed} order(s).`, ok: true });
        router.refresh();
      } else {
        setToast({ msg: res.error, ok: false });
      }
    });
  }

  const stats = [
    { label: "Orders", value: String(live.length) },
    { label: "Pending", value: `${pendingOrders.length} · ${inr(pendingValue)}` },
    { label: "Billed", value: `${billedOrders.length} · ${inr(billedValue)}` },
    { label: "Day value", value: inr(pendingValue + billedValue) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-display-xs font-semibold text-primary">Billing</h1>
          <p className="mt-1 text-sm text-tertiary">
            {formatDateStr(windowDate)} window · pick orders, set today&apos;s rate, finalize
          </p>
          <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
            {stats.map((s) => (
              <div key={s.label} className="flex items-baseline gap-1.5">
                <dt className="text-xs text-quaternary">{s.label}</dt>
                <dd className="text-sm font-semibold text-primary">{s.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="flex items-center gap-1.5">
          <Button size="sm" color="secondary" href={`/admin/billing?date=${shiftDate(windowDate, -1)}`}>
            ← Prev
          </Button>
          <input
            type="date"
            aria-label="Billing date"
            value={windowDate}
            onChange={(e) => {
              if (/^\d{4}-\d{2}-\d{2}$/.test(e.target.value)) {
                router.push(`/admin/billing?date=${e.target.value}`);
              }
            }}
            className="h-9 rounded-lg bg-primary px-2 text-sm text-primary shadow-xs ring-1 ring-primary outline-focus-ring ring-inset focus-visible:outline-2"
          />
          <Button size="sm" color="secondary" href={`/admin/billing?date=${shiftDate(windowDate, 1)}`}>
            Next →
          </Button>
        </div>
      </div>

      {/* Post-finalize: send invoices over WhatsApp */}
      {finalized && finalized.length > 0 && (
        <section className="rounded-xl bg-success-primary p-4 ring-1 ring-utility-green-200 ring-inset">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-md font-semibold text-success-primary">
                Billed {finalized.length} order(s) — send the invoices
              </h2>
              <p className="mt-0.5 text-sm text-success-primary">
                WhatsApp opens with the bill text ready — the PDF opens alongside it, attach and send.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFinalized(null)}
              className="cursor-pointer rounded-md px-2 py-1 text-sm font-semibold text-success-primary outline-focus-ring hover:bg-success-secondary focus-visible:outline-2"
            >
              Dismiss
            </button>
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {finalized.map((f) => {
              const wa = waNumber(f.phone);
              const msg =
                `Namaste ${f.vendorName}! Your Vaibhav Fruits invoice ${invoiceNo(f.id, windowDate)} ` +
                `(${formatDateStr(windowDate)}) totals ${inr(f.total)}. Please pay on delivery.`;
              return (
                <li
                  key={f.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg bg-primary p-3 shadow-xs ring-1 ring-secondary"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-primary">{f.vendorName}</p>
                    <p className="text-sm text-tertiary">
                      {invoiceNo(f.id, windowDate)} · {inr(f.total)}
                      {!wa && " · no phone on file"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    color="secondary"
                    href={`/api/invoice/${f.id}`}
                    iconLeading={Printer}
                    {...{ target: "_blank", rel: "noopener noreferrer" }}
                  >
                    Invoice PDF
                  </Button>
                  {wa ? (
                    <Button
                      size="sm"
                      color="primary"
                      href={`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`}
                      iconLeading={MessageChatCircle}
                      {...{ target: "_blank", rel: "noopener noreferrer" }}
                    >
                      Send via WhatsApp
                    </Button>
                  ) : (
                    <Badge size="sm" type="pill-color" color="gray">
                      Add phone in Settings → Retailers
                    </Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div className="grid items-start gap-4 lg:grid-cols-12">
        {/* ---------- Order selection ---------- */}
        <section className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary lg:col-span-5">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="min-w-35 flex-1">
              <Input
                size="md"
                aria-label="Search retailer"
                placeholder="Search retailer"
                value={vendorQuery}
                onChange={(v) => setVendorQuery(v)}
              />
            </div>
            <div className="w-30">
              <Select
                size="md"
                aria-label="Rank"
                items={[{ id: "ALL", label: "All ranks" }, ...TIERS.map((t) => ({ id: t, label: TIER_LABELS[t] }))]}
                selectedKey={tierFilter}
                onSelectionChange={(k) => setTierFilter(String(k))}
              >
                {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
              </Select>
            </div>
            <div className="w-30">
              <Select
                size="md"
                aria-label="Sort orders"
                items={[
                  { id: "tier", label: "Rank" },
                  { id: "vendor", label: "Name" },
                  { id: "total", label: "Total" },
                ]}
                selectedKey={orderSort}
                onSelectionChange={(k) => setOrderSort(String(k))}
              >
                {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
              </Select>
            </div>
          </div>
          <div className="mb-2 flex items-center gap-2">
            <Button size="sm" color="link-gray" onClick={() => setSelected(new Set(visibleOrders.map((o) => o.id)))}>
              Select all
            </Button>
            <Button size="sm" color="link-gray" onClick={() => setSelected(new Set())}>
              None
            </Button>
            <span className="ml-auto text-sm text-tertiary">{selected.size} selected</span>
          </div>
          <label className="mb-3 flex cursor-pointer items-center gap-2 rounded-lg bg-secondary px-3 py-2">
            <Checkbox
              size="sm"
              aria-label="Show billed orders"
              isSelected={showBilled}
              onChange={setShowBilled}
            />
            <span className="text-sm font-medium text-secondary">
              Show billed ({billedOrders.length}) for re-edit
            </span>
          </label>
          {visibleOrders.length === 0 ? (
            <EmptyState size="md">
              <EmptyState.FeaturedIcon color="gray" />
              <EmptyState.Title>
                {showBilled ? "No orders match" : "Nothing left to bill"}
              </EmptyState.Title>
              <EmptyState.Description>
                {showBilled
                  ? "Try a different search or rank."
                  : "All orders for this window are billed. Toggle “Show billed” to re-edit one."}
              </EmptyState.Description>
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {visibleOrders.map((o) => {
                const on = selected.has(o.id);
                return (
                  <li key={o.id}>
                    <button
                      type="button"
                      onClick={() => toggle(o.id)}
                      aria-pressed={on}
                      className={cx(
                        "flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2.5 text-left ring-1 outline-focus-ring transition-colors ring-inset focus-visible:outline-2",
                        on ? "bg-brand-primary ring-brand" : "bg-primary ring-secondary hover:bg-primary_hover",
                      )}
                    >
                      <Checkbox size="sm" aria-label={`Select ${o.vendorName}`} isSelected={on} onChange={() => toggle(o.id)} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-primary">{o.vendorName}</span>
                          <Badge size="sm" type="pill-color" color={o.tier === "VIP" ? "warning" : "gray"}>
                            {TIER_LABELS[o.tier]}
                          </Badge>
                        </span>
                        <span className="mt-0.5 block text-sm text-tertiary">
                          {o.items.length} items · {inr(orderValue(o))}
                        </span>
                      </span>
                      <Badge size="sm" type="pill-color" color={STATUS_BADGE[o.status]}>
                        {ORDER_STATUS_LABELS[o.status]}
                      </Badge>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* ---------- Product totals + line editors ---------- */}
        <section className="flex flex-col gap-4 lg:col-span-7">
          <div className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
            <h2 className="text-md font-semibold text-primary">
              Products across selection ({summary.length})
            </h2>
            <div className="mt-3 mb-3 flex flex-wrap gap-2">
              <div className="min-w-35 flex-1">
                <Input
                  size="md"
                  aria-label="Search product"
                  placeholder="Search product"
                  value={productQuery}
                  onChange={(v) => setProductQuery(v)}
                />
              </div>
              <div className="w-35">
                <Select
                  size="md"
                  aria-label="Category"
                  items={[
                    { id: "ALL", label: "All categories" },
                    ...CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABELS[c] })),
                    { id: "__NONE__", label: "Other" },
                  ]}
                  selectedKey={catFilter}
                  onSelectionChange={(k) => setCatFilter(String(k))}
                >
                  {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
                </Select>
              </div>
              <div className="w-35">
                <Select
                  size="md"
                  aria-label="Sort products"
                  items={[
                    { id: "name:asc", label: "Name ↑" },
                    { id: "name:desc", label: "Name ↓" },
                    { id: "qty:desc", label: "Qty ↓" },
                    { id: "qty:asc", label: "Qty ↑" },
                    { id: "amount:desc", label: "Amount ↓" },
                    { id: "amount:asc", label: "Amount ↑" },
                  ]}
                  selectedKey={`${sortKey}:${sortDir}`}
                  onSelectionChange={(k) => {
                    const [sk, sd] = String(k).split(":");
                    setSortKey(sk);
                    setSortDir(sd);
                  }}
                >
                  {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
                </Select>
              </div>
            </div>
            {summary.length === 0 ? (
              <p className="text-sm text-tertiary">Select orders to see product totals.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-120 text-sm">
                  <thead>
                    <tr className="text-left text-xs text-quaternary">
                      <th className="px-2 py-2 font-semibold">Product</th>
                      <th className="px-2 py-2 text-right font-semibold">Qty</th>
                      <th className="w-32 px-2 py-2 text-right font-semibold">Rate</th>
                      <th className="px-2 py-2 text-right font-semibold">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.map((r) => (
                      <tr key={r.key} className="border-t border-secondary">
                        <td className="px-2 py-2">
                          <span className="font-medium text-primary">{r.name}</span>
                          <span className="block text-xs text-tertiary">
                            {r.category ? CATEGORY_LABELS[r.category] : "Other"} · per {UNIT_LABELS[r.unit]}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right whitespace-nowrap text-tertiary">
                          {r.qty} {UNIT_LABELS[r.unit]}
                        </td>
                        <td className="px-2 py-2">
                          <Input
                            size="sm"
                            aria-label={`Rate for ${r.name}`}
                            value={r.rate === null ? "" : String(r.rate)}
                            placeholder={r.rate === null ? "mixed" : undefined}
                            onChange={(v) => setProductRate(r.key, v.replace(/[^0-9.]/g, ""))}
                          />
                        </td>
                        <td className="px-2 py-2 text-right font-semibold text-primary">
                          {inr(r.qty * (r.rate ?? 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <p className="mt-2 text-right text-sm font-semibold text-primary">
              Selection total: {inr(grandTotal)}
            </p>
          </div>

          {selectedOrders.map((o) => (
            <details
              key={o.id}
              open={selectedOrders.length <= 3}
              className="group rounded-xl bg-primary shadow-xs ring-1 ring-secondary"
            >
              <summary className="flex cursor-pointer items-center gap-2 p-4 outline-focus-ring focus-visible:outline-2 [&::-webkit-details-marker]:hidden">
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-primary">
                  {o.vendorName}
                </span>
                <Badge size="sm" type="pill-color" color={o.tier === "VIP" ? "warning" : "gray"}>
                  {TIER_LABELS[o.tier]}
                </Badge>
                <span className="text-sm text-tertiary">{inr(orderValue(o))}</span>
                <Badge size="sm" type="pill-color" color={STATUS_BADGE[o.status]}>
                  {ORDER_STATUS_LABELS[o.status]}
                </Badge>
                <span className="text-fg-quaternary transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="border-t border-secondary p-4 pt-2">
                {o.items.map((i) => {
                  const e = editOf(i);
                  return (
                    <div
                      key={i.id}
                      className="flex flex-wrap items-center gap-2 border-b border-secondary py-2 last:border-0"
                    >
                      <div className="min-w-30 flex-1">
                        <p className="text-sm font-semibold text-primary">{i.productName}</p>
                        <p className="text-xs text-tertiary">
                          ordered {i.quantity} {UNIT_LABELS[i.unit]}
                        </p>
                      </div>
                      <div className="w-24">
                        <Input
                          size="sm"
                          aria-label={`Quantity for ${i.productName}`}
                          value={e.qty}
                          onChange={(v) => setLine(i.id, { qty: v.replace(/[^0-9.]/g, "") })}
                        />
                      </div>
                      <div className="w-24">
                        <Select
                          size="sm"
                          aria-label={`Unit for ${i.productName}`}
                          items={UNITS.map((u) => ({ id: u, label: UNIT_LABELS[u] }))}
                          selectedKey={e.unit}
                          onSelectionChange={(k) => {
                            const to = String(k) as Unit;
                            const fromUnit = editOf(i).unit;
                            setLine(i.id, {
                              unit: to,
                              qty: String(convertQty(num(editOf(i).qty, 0), fromUnit, to)),
                            });
                          }}
                        >
                          {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
                        </Select>
                      </div>
                      <div className="w-24">
                        <Input
                          size="sm"
                          aria-label={`Rate for ${i.productName}`}
                          value={e.price}
                          onChange={(v) => setLine(i.id, { price: v.replace(/[^0-9.]/g, "") })}
                        />
                      </div>
                      <span className="min-w-16 text-right text-sm font-semibold text-primary">
                        {inr(lineValue(i))}
                      </span>
                    </div>
                  );
                })}
                <div className="mt-2 flex justify-end">
                  {o.status === "PLACED" ? (
                    <Badge size="sm" type="pill-color" color="blue">
                      Invoice available after billing
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      color="secondary"
                      href={`/api/invoice/${o.id}`}
                      iconLeading={Printer}
                      {...{ target: "_blank", rel: "noopener noreferrer" }}
                    >
                      Invoice PDF
                    </Button>
                  )}
                </div>
              </div>
            </details>
          ))}

          <div className="sticky bottom-20 flex flex-wrap items-center gap-2 rounded-xl bg-primary p-4 shadow-lg ring-1 ring-secondary lg:static lg:bottom-auto lg:shadow-xs">
            <p className="flex-1 text-sm font-semibold text-primary">
              {selectedOrders.length} order(s) · {inr(grandTotal)}
            </p>
            <Button
              size="md"
              color="primary"
              isLoading={pending}
              isDisabled={pending || selectedOrders.length === 0}
              onClick={() => {
                if (selectedOrders.length > 0) setConfirmOpen(true);
              }}
            >
              Finalize billing
            </Button>
          </div>
        </section>
      </div>

      {/* Finalize confirm */}
      <ModalOverlay isOpen={confirmOpen} onOpenChange={setConfirmOpen} isDismissable>
        <Modal className="sm:max-w-md">
          <Dialog className="p-6">
            <h2 className="text-md font-semibold text-primary">Finalize billing?</h2>
            <p className="mt-1 text-sm text-tertiary">
              {selectedOrders.length} order(s), total {inr(grandTotal)}. Rates, quantities and
              units will be written to the orders and billed orders will leave this list.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="md" color="secondary" onClick={() => setConfirmOpen(false)}>
                Keep editing
              </Button>
              <Button size="md" color="primary" isLoading={pending} onClick={doFinalize}>
                Finalize
              </Button>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={cx(
            "fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl p-3.5 text-sm font-medium shadow-lg ring-1 ring-inset lg:bottom-8",
            toast.ok ? "bg-success-solid text-white ring-transparent" : "bg-error-solid text-white ring-transparent",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span>{toast.msg}</span>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="cursor-pointer rounded-md px-2 py-0.5 outline-focus-ring hover:bg-white/15 focus-visible:outline-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      <p className="text-sm text-tertiary">
        <Link href="/admin/orders" className="text-brand-secondary hover:underline">
          View billed orders in Reports
        </Link>
      </p>
    </div>
  );
}
