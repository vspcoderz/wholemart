"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseDate } from "@internationalized/date";
import type { DateValue, Selection } from "react-aria-components";
import { Eye, Printer, SearchLg } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { MultiSelect } from "@/components/base/select/multi-select";
import { Select } from "@/components/base/select/select";
import type { SelectItemType } from "@/components/base/select/select-shared";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Table, TableCard } from "@/components/application/table/table";
import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import type { Tier } from "@/db/schema";
import {
  ORDER_STATUS_LABELS,
  TIER_LABELS,
  TIER_RANK,
  TIERS,
  formatDateStr,
  inr,
} from "@/lib/format";
import { usePollingRefresh } from "@/lib/polling";
import { cx } from "@/utils/cx";

export type AdminOrderRow = {
  id: number;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  tier: Tier;
  windowDate: string;
  placedAt: string;
  vendorName: string;
  total: number;
  itemCount: number;
};

export type MoneyRow = {
  id: number;
  type: "CHARGE" | "PAYMENT" | "ADJUSTMENT";
  amount: number;
  note: string | null;
  orderId: number | null;
  createdAt: string;
  vendorName: string;
};

export type RetailerOption = { id: number; businessName: string; tier: Tier };

const STATUS_BADGE: Record<AdminOrderRow["status"], "blue" | "warning" | "success" | "gray"> = {
  PLACED: "blue",
  CONFIRMED: "warning",
  DELIVERED: "success",
  CANCELLED: "gray",
};

const TXN_LABEL: Record<MoneyRow["type"], string> = {
  CHARGE: "Billed",
  PAYMENT: "Paid",
  ADJUSTMENT: "Adjusted",
};

const TXN_BADGE: Record<MoneyRow["type"], "warning" | "success" | "blue"> = {
  CHARGE: "warning",
  PAYMENT: "success",
  ADJUSTMENT: "blue",
};

function formatTxnDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function selectionToIds(sel: Selection): number[] {
  if (sel === "all") return [];
  return [...sel].map(Number).filter((n) => Number.isInteger(n) && n > 0);
}

export default function ReportsClient({
  initialTab,
  from,
  to,
  retailerIds,
  tiers,
  retailers,
  rows,
  txns,
  grandTotal,
  truncated,
  txnsTruncated,
}: {
  initialTab: "orders" | "outstanding";
  from: string | null;
  to: string | null;
  retailerIds: number[];
  tiers: Tier[];
  retailers: RetailerOption[];
  rows: AdminOrderRow[];
  txns: MoneyRow[];
  grandTotal: number;
  truncated: boolean;
  txnsTruncated: boolean;
}) {
  usePollingRefresh(30000);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("recent");
  const [txnType, setTxnType] = useState("ALL");

  const tab = searchParams.get("tab") === "outstanding" ? "outstanding" : initialTab;

  const setParams = (mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(searchParams.toString());
    mutate(p);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  // Date range: local calendar state, committed to the URL on Apply.
  const [range, setRange] = useState<{ start: DateValue; end: DateValue } | null>(() => {
    try {
      return from && to ? { start: parseDate(from), end: parseDate(to) } : null;
    } catch {
      return null;
    }
  });
  // Re-syncs when the URL params change (back/forward nav, Reset).
  /* eslint-disable react-hooks/set-state-in-effect -- sync-on-prop-change by design */
  useEffect(() => {
    try {
      setRange(from && to ? { start: parseDate(from), end: parseDate(to) } : null);
    } catch {
      setRange(null);
    }
  }, [from, to]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const retailerItems: SelectItemType[] = useMemo(
    () =>
      retailers.map((r) => ({
        id: String(r.id),
        label: r.businessName,
        supportingText: TIER_LABELS[r.tier],
      })),
    [retailers],
  );

  const tierItems: SelectItemType[] = useMemo(
    () => TIERS.map((t) => ({ id: t, label: TIER_LABELS[t] })),
    [],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const r = rows.filter(
      (o) =>
        (status === "ALL" || o.status === status) &&
        (q === "" || o.vendorName.toLowerCase().includes(q)),
    );
    r.sort((a, b) => {
      if (sort === "total") return b.total - a.total;
      if (sort === "vendor") return a.vendorName.localeCompare(b.vendorName);
      if (sort === "tier")
        return TIER_RANK[a.tier] - TIER_RANK[b.tier] || b.placedAt.localeCompare(a.placedAt);
      return b.placedAt.localeCompare(a.placedAt);
    });
    return r;
  }, [rows, query, status, sort]);

  const visibleTxns = useMemo(() => {
    const q = query.trim().toLowerCase();
    return txns.filter(
      (t) =>
        (txnType === "ALL" || t.type === txnType) &&
        (q === "" ||
          t.vendorName.toLowerCase().includes(q) ||
          (t.note ?? "").toLowerCase().includes(q)),
    );
  }, [txns, query, txnType]);

  const bulkHref =
    visible.length > 0 ? `/api/invoices/bulk?ids=${visible.map((o) => o.id).join(",")}` : null;

  const rangeLabel =
    from || to
      ? `${from ? formatDateStr(from) : "…"} – ${to ? formatDateStr(to) : "…"}`
      : "All dates";

  const orderColumns = [
    { id: "retailer", label: "Retailer" },
    { id: "window", label: "Window" },
    { id: "items", label: "Items" },
    { id: "total", label: "Total" },
    { id: "status", label: "Status" },
    { id: "actions", label: "" },
  ];

  const txnColumns = [
    { id: "retailer", label: "Retailer" },
    { id: "entry", label: "Entry" },
    { id: "date", label: "Date" },
    { id: "amount", label: "Amount" },
  ];

  const ordersTable = (
    <Table aria-label="Billed orders" className="min-w-175">
      <Table.Header columns={orderColumns}>
        {(col) => <Table.Head key={col.id} id={col.id} label={col.label} />}
      </Table.Header>
      <Table.Body items={visible}>
        {(o) => (
          <Table.Row key={o.id} id={o.id} columns={orderColumns}>
            {(col) => (
              <Table.Cell key={col.id}>
                {col.id === "retailer" && (
                  <span className="flex items-center gap-2">
                    <Link
                      href={`/admin/orders/${o.id}`}
                      className="font-semibold text-primary hover:text-brand-secondary"
                    >
                      {o.vendorName}
                    </Link>
                    <Badge size="sm" type="pill-color" color={o.tier === "VIP" ? "warning" : "gray"}>
                      {TIER_LABELS[o.tier]}
                    </Badge>
                  </span>
                )}
                {col.id === "window" && <span className="whitespace-nowrap">{formatDateStr(o.windowDate)}</span>}
                {col.id === "items" && o.itemCount}
                {col.id === "total" && <span className="font-semibold text-primary">{inr(o.total)}</span>}
                {col.id === "status" && (
                  <Badge size="sm" type="pill-color" color={STATUS_BADGE[o.status]}>
                    {ORDER_STATUS_LABELS[o.status]}
                  </Badge>
                )}
                {col.id === "actions" && (
                  <span className="flex items-center justify-end gap-1">
                    <a
                      href={`/api/invoice/${o.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Print invoice"
                      aria-label={`Print invoice for order ${o.id}`}
                      className="rounded-md p-2 text-fg-quaternary outline-focus-ring transition-colors hover:bg-primary_hover hover:text-fg-secondary_hover focus-visible:outline-2"
                    >
                      <Printer className="size-4" />
                    </a>
                    <Link
                      href={`/admin/orders/${o.id}`}
                      title="View order"
                      aria-label={`View order ${o.id}`}
                      className="rounded-md p-2 text-fg-quaternary outline-focus-ring transition-colors hover:bg-primary_hover hover:text-fg-secondary_hover focus-visible:outline-2"
                    >
                      <Eye className="size-4" />
                    </Link>
                  </span>
                )}
              </Table.Cell>
            )}
          </Table.Row>
        )}
      </Table.Body>
    </Table>
  );

  const ordersCards = (
    <ul className="flex flex-col gap-2">
      {visible.map((o) => (
        <li key={o.id} className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/admin/orders/${o.id}`}
                className="font-semibold text-primary hover:text-brand-secondary"
              >
                {o.vendorName}
              </Link>
              <p className="mt-0.5 text-sm text-tertiary">
                {formatDateStr(o.windowDate)} · {o.itemCount} items · {inr(o.total)}
              </p>
            </div>
            <Badge size="sm" type="pill-color" color={STATUS_BADGE[o.status]}>
              {ORDER_STATUS_LABELS[o.status]}
            </Badge>
          </div>
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              color="secondary"
              className="flex-1"
              href={`/admin/orders/${o.id}`}
              iconLeading={Eye}
            >
              View
            </Button>
            <Button
              size="sm"
              color="secondary"
              className="flex-1"
              href={`/api/invoice/${o.id}`}
              iconLeading={Printer}
              {...{ target: "_blank", rel: "noopener noreferrer" }}
            >
              Print
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );

  const txnsTable = (
    <Table aria-label="Money entries" className="min-w-175">
      <Table.Header columns={txnColumns}>
        {(col) => <Table.Head key={col.id} id={col.id} label={col.label} />}
      </Table.Header>
      <Table.Body items={visibleTxns}>
        {(t) => (
          <Table.Row key={t.id} id={t.id} columns={txnColumns}>
            {(col) => (
              <Table.Cell key={col.id}>
                {col.id === "retailer" && <span className="font-semibold text-primary">{t.vendorName}</span>}
                {col.id === "entry" && (
                  <span className="flex flex-col gap-1">
                    <Badge size="sm" type="pill-color" color={TXN_BADGE[t.type]}>
                      {TXN_LABEL[t.type]}
                    </Badge>
                    <span className="text-xs">
                      {t.note ?? ""}
                      {t.orderId ? (
                        <>
                          {" · "}
                          <Link href={`/admin/orders/${t.orderId}`} className="text-brand-secondary hover:underline">
                            order #{t.orderId}
                          </Link>
                        </>
                      ) : null}
                    </span>
                  </span>
                )}
                {col.id === "date" && <span className="whitespace-nowrap">{formatTxnDate(t.createdAt)}</span>}
                {col.id === "amount" && (
                  <span className={cx("font-semibold", t.amount >= 0 ? "text-warning-primary" : "text-success-primary")}>
                    {t.amount >= 0 ? "+" : "−"}
                    {inr(Math.abs(t.amount))}
                  </span>
                )}
              </Table.Cell>
            )}
          </Table.Row>
        )}
      </Table.Body>
    </Table>
  );

  const txnsCards = (
    <ul className="flex flex-col gap-2">
      {visibleTxns.map((t) => (
        <li key={t.id} className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-semibold text-primary">{t.vendorName}</p>
              <p className="mt-0.5 text-sm text-tertiary">
                {formatTxnDate(t.createdAt)}
                {t.note ? ` · ${t.note}` : ""}
                {t.orderId ? ` · order #${t.orderId}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className={cx("font-semibold", t.amount >= 0 ? "text-warning-primary" : "text-success-primary")}>
                {t.amount >= 0 ? "+" : "−"}
                {inr(Math.abs(t.amount))}
              </span>
              <Badge size="sm" type="pill-color" color={TXN_BADGE[t.type]}>
                {TXN_LABEL[t.type]}
              </Badge>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-display-xs font-semibold text-primary">Reports</h1>
          <p className="mt-1 text-sm text-tertiary">
            {rangeLabel} · {rows.length} orders · {inr(grandTotal)} billed{truncated && " · showing latest 200"}
          </p>
        </div>
        {tab === "orders" && bulkHref && (
          <Button
            size="md"
            color="secondary"
            href={bulkHref}
            iconLeading={Printer}
            {...{ target: "_blank", rel: "noopener noreferrer" }}
          >
            Print visible ({visible.length})
          </Button>
        )}
      </div>

      <Tabs
        selectedKey={tab}
        onSelectionChange={(k) =>
          setParams((p) => {
            if (k === "outstanding") p.set("tab", "outstanding");
            else p.delete("tab");
          })
        }
      >
        <TabList type="underline" size="md">
          <Tab id="orders" label="Orders" badge={rows.length} />
          <Tab id="outstanding" label="Outstanding" badge={txns.length} />
        </TabList>
      </Tabs>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-2">
        <DateRangePicker
          size="md"
          value={range}
          onChange={(v) => setRange(v)}
          onApply={() =>
            setParams((p) => {
              if (range?.start && range?.end) {
                p.set("from", range.start.toString());
                p.set("to", range.end.toString());
              } else {
                p.delete("from");
                p.delete("to");
              }
            })
          }
          onCancel={() =>
            setRange(() => {
              try {
                return from && to ? { start: parseDate(from), end: parseDate(to) } : null;
              } catch {
                return null;
              }
            })
          }
        />
        <div className="min-w-45 flex-1 sm:max-w-65">
          <MultiSelect
            size="md"
            placeholder="All retailers"
            selectedCountFormatter={(n) => `${n} retailer${n === 1 ? "" : "s"}`}
            items={retailerItems}
            selectedKeys={new Set(retailerIds.map(String))}
            showFooter={false}
            onSelectionChange={(sel) =>
              setParams((p) => {
                const ids = selectionToIds(sel);
                if (ids.length > 0) p.set("retailers", ids.join(","));
                else p.delete("retailers");
              })
            }
          >
            {(item) => (
              <MultiSelect.Item
                key={item.id}
                id={String(item.id)}
                label={item.label}
                supportingText={item.supportingText}
              />
            )}
          </MultiSelect>
        </div>
        <div className="min-w-35 flex-1 sm:max-w-45">
          <MultiSelect
            size="md"
            placeholder="All ranks"
            selectedCountFormatter={(n) => `${n} rank${n === 1 ? "" : "s"}`}
            items={tierItems}
            selectedKeys={new Set(tiers)}
            showFooter={false}
            onSelectionChange={(sel) =>
              setParams((p) => {
                const picked = sel === "all" ? [...TIERS] : [...sel].map(String);
                if (picked.length > 0) p.set("tiers", picked.join(","));
                else p.delete("tiers");
              })
            }
          >
            {(item) => <MultiSelect.Item key={item.id} id={String(item.id)} label={item.label} />}
          </MultiSelect>
        </div>
        <div className="min-w-40 flex-1 sm:max-w-60">
          <Input
            size="md"
            aria-label={tab === "orders" ? "Search retailer" : "Search retailer or note"}
            placeholder={tab === "orders" ? "Search retailer" : "Search retailer / note"}
            icon={SearchLg}
            value={query}
            onChange={(v) => setQuery(v)}
          />
        </div>
        {tab === "orders" ? (
          <>
            <div className="w-35">
              <Select
                size="md"
                aria-label="Status"
                items={[
                  { id: "ALL", label: "All statuses" },
                  { id: "CONFIRMED", label: ORDER_STATUS_LABELS.CONFIRMED },
                  { id: "DELIVERED", label: ORDER_STATUS_LABELS.DELIVERED },
                  { id: "CANCELLED", label: ORDER_STATUS_LABELS.CANCELLED },
                ]}
                selectedKey={status}
                onSelectionChange={(k) => setStatus(String(k))}
              >
                {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
              </Select>
            </div>
            <div className="w-35">
              <Select
                size="md"
                aria-label="Sort"
                items={[
                  { id: "recent", label: "Most recent" },
                  { id: "tier", label: "Rank (VIP first)" },
                  { id: "total", label: "Highest total" },
                  { id: "vendor", label: "Retailer A–Z" },
                ]}
                selectedKey={sort}
                onSelectionChange={(k) => setSort(String(k))}
              >
                {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
              </Select>
            </div>
          </>
        ) : (
          <div className="w-35">
            <Select
              size="md"
              aria-label="Entry type"
              items={[
                { id: "ALL", label: "All entries" },
                { id: "CHARGE", label: "Billed" },
                { id: "PAYMENT", label: "Paid" },
                { id: "ADJUSTMENT", label: "Adjusted" },
              ]}
              selectedKey={txnType}
              onSelectionChange={(k) => setTxnType(String(k))}
            >
              {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
            </Select>
          </div>
        )}
        {(from || to || retailerIds.length > 0 || tiers.length > 0) && (
          <Button size="md" color="link-gray" onClick={() => router.replace(pathname, { scroll: false })}>
            Reset
          </Button>
        )}
      </div>

      {tab === "orders" ? (
        visible.length === 0 ? (
          <EmptyState size="md">
            <EmptyState.FeaturedIcon color="gray" />
            <EmptyState.Title>No orders match</EmptyState.Title>
            <EmptyState.Description>Try widening the date range or clearing filters.</EmptyState.Description>
          </EmptyState>
        ) : (
          <>
            <TableCard.Root className="max-md:hidden">
              <TableCard.Header
                title="Billed orders"
                badge={visible.length}
                description={truncated ? "Showing latest 200 — narrow the filters to see more." : undefined}
              />
              {ordersTable}
            </TableCard.Root>
            <div className="md:hidden">{ordersCards}</div>
          </>
        )
      ) : visibleTxns.length === 0 ? (
        <EmptyState size="md">
          <EmptyState.FeaturedIcon color="gray" />
          <EmptyState.Title>No money movement yet</EmptyState.Title>
          <EmptyState.Description>Entries appear here after billing and payments.</EmptyState.Description>
        </EmptyState>
      ) : (
        <>
          <TableCard.Root className="max-md:hidden">
            <TableCard.Header
              title="Money trail"
              badge={visibleTxns.length}
              description={txnsTruncated ? "Showing latest 200 — narrow the filters to see more." : undefined}
            />
            {txnsTable}
          </TableCard.Root>
          <div className="md:hidden">{txnsCards}</div>
        </>
      )}
    </div>
  );
}
