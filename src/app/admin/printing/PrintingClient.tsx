"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { parseDate } from "@internationalized/date";
import type { DateValue, Selection } from "react-aria-components";
import { Printer } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Checkbox } from "@/components/base/checkbox/checkbox";
import { Input } from "@/components/base/input/input";
import { MultiSelect } from "@/components/base/select/multi-select";
import { Select } from "@/components/base/select/select";
import type { SelectItemType } from "@/components/base/select/select-shared";
import { DateRangePicker } from "@/components/application/date-picker/date-range-picker";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import type { Tier } from "@/db/schema";
import {
  ORDER_STATUS_LABELS,
  TIER_LABELS,
  TIERS,
  formatDateStr,
  inr,
} from "@/lib/format";
import { usePollingRefresh } from "@/lib/polling";
import { cx } from "@/utils/cx";

export type PrintableOrder = {
  id: number;
  status: "CONFIRMED" | "DELIVERED";
  windowDate: string;
  vendorName: string;
  total: number;
  itemCount: number;
};

export type RetailerOption = { id: number; businessName: string; tier: Tier };

/** Server caps bulk PDFs at 100 orders per file. */
const BULK_LIMIT = 100;

export default function PrintingClient({
  from,
  to,
  retailerIds,
  tiers,
  retailers,
  rows,
  truncated,
}: {
  from: string | null;
  to: string | null;
  retailerIds: number[];
  tiers: Tier[];
  retailers: RetailerOption[];
  rows: PrintableOrder[];
  truncated: boolean;
}) {
  usePollingRefresh(30000);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [selected, setSelected] = useState<Set<number>>(() => new Set(rows.map((r) => r.id)));
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  // Stay in sync when fresh rows arrive: prune gone ids, select new arrivals.
  /* eslint-disable react-hooks/set-state-in-effect -- sync-on-prop-change by design */
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(rows.map((r) => r.id));
      const next = new Set<number>();
      for (const id of prev) if (ids.has(id)) next.add(id);
      for (const id of ids) next.add(id);
      return next;
    });
  }, [rows]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setParams = (mutate: (p: URLSearchParams) => void) => {
    const p = new URLSearchParams(searchParams.toString());
    mutate(p);
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

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

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (o) =>
        (status === "ALL" || o.status === status) &&
        (q === "" || o.vendorName.toLowerCase().includes(q)),
    );
  }, [rows, query, status]);

  const selectedRows = useMemo(() => rows.filter((o) => selected.has(o.id)), [rows, selected]);
  const selectedTotal = selectedRows.reduce((s, o) => s + o.total, 0);
  const overLimit = selectedRows.length > BULK_LIMIT;

  const bulkHref =
    selectedRows.length === 0
      ? null
      : `/api/invoices/bulk?ids=${selectedRows
          .slice(0, BULK_LIMIT)
          .map((o) => o.id)
          .join(",")}`;

  function toggle(id: number) {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const rangeLabel =
    from || to
      ? `${from ? formatDateStr(from) : "…"} – ${to ? formatDateStr(to) : "…"}`
      : "All dates";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-display-xs font-semibold text-primary">Printing</h1>
        <p className="mt-1 text-sm text-tertiary">
          Billed orders · {rangeLabel} · {rows.length} orders
          {truncated && " · showing latest 200"} · pick any set and print one combined PDF, each
          order on its own page.
        </p>
      </div>

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
          onCancel={() => {
            try {
              setRange(from && to ? { start: parseDate(from), end: parseDate(to) } : null);
            } catch {
              setRange(null);
            }
          }}
        />
        <div className="min-w-45 flex-1 sm:max-w-65">
          <MultiSelect
            size="md"
            placeholder="All retailers"
            selectedCountFormatter={(n) => `${n} retailer${n === 1 ? "" : "s"}`}
            items={retailerItems}
            selectedKeys={new Set(retailerIds.map(String))}
            showFooter={false}
            onSelectionChange={(sel: Selection) =>
              setParams((p) => {
                const ids =
                  sel === "all"
                    ? []
                    : [...sel].map(Number).filter((n) => Number.isInteger(n) && n > 0);
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
            items={TIERS.map((t) => ({ id: t, label: TIER_LABELS[t] }))}
            selectedKeys={new Set(tiers)}
            showFooter={false}
            onSelectionChange={(sel: Selection) =>
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
            aria-label="Search retailer"
            placeholder="Search retailer"
            value={query}
            onChange={(v) => setQuery(v)}
          />
        </div>
        <div className="w-35">
          <Select
            size="md"
            aria-label="Status"
            items={[
              { id: "ALL", label: "All" },
              { id: "CONFIRMED", label: "Billed" },
              { id: "DELIVERED", label: "Delivered" },
            ]}
            selectedKey={status}
            onSelectionChange={(k) => setStatus(String(k))}
          >
            {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
          </Select>
        </div>
        {(from || to || retailerIds.length > 0 || tiers.length > 0) && (
          <Button size="md" color="link-gray" onClick={() => router.replace(pathname, { scroll: false })}>
            Reset
          </Button>
        )}
      </div>

      {/* Bulk bar */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-primary p-3 shadow-xs ring-1 ring-secondary">
        <Button size="sm" color="link-gray" onClick={() => setSelected(new Set(visible.map((o) => o.id)))}>
          Select visible
        </Button>
        <Button size="sm" color="link-gray" onClick={() => setSelected(new Set())}>
          None
        </Button>
        <span className="text-sm text-tertiary">
          {selectedRows.length} selected · {inr(selectedTotal)} · ~{selectedRows.length} page
          {selectedRows.length === 1 ? "" : "s"}
        </span>
        {bulkHref && (
          <Button
            size="sm"
            color="primary"
            className="ml-auto"
            href={bulkHref}
            iconLeading={Printer}
            {...{ target: "_blank", rel: "noopener noreferrer" }}
          >
            Print PDF
          </Button>
        )}
      </div>
      {overLimit && (
        <p className="text-sm text-warning-primary">
          {selectedRows.length} selected — one file holds {BULK_LIMIT} orders, so only the first{" "}
          {BULK_LIMIT} are included. Narrow the filters to print the rest.
        </p>
      )}

      {visible.length === 0 ? (
        <EmptyState size="md">
          <EmptyState.FeaturedIcon color="gray" />
          <EmptyState.Title>No billed orders</EmptyState.Title>
          <EmptyState.Description>Finalize orders in Billing first — only billed orders print.</EmptyState.Description>
        </EmptyState>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {visible.map((o) => {
            const on = selected.has(o.id);
            return (
              <li key={o.id}>
                <div
                  className={cx(
                    "flex items-center gap-2.5 rounded-lg p-2.5 ring-1 ring-inset",
                    on ? "bg-brand-primary ring-brand" : "bg-primary ring-secondary",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggle(o.id)}
                    aria-pressed={on}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-left outline-focus-ring focus-visible:outline-2"
                  >
                    <Checkbox size="sm" aria-label={`Select order ${o.id}`} isSelected={on} onChange={() => toggle(o.id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-primary">
                        {o.vendorName}
                      </span>
                      <span className="mt-0.5 block text-sm text-tertiary">
                        #{o.id} · {formatDateStr(o.windowDate)} · {o.itemCount} items · {inr(o.total)}
                      </span>
                    </span>
                    <Badge size="sm" type="pill-color" color={o.status === "DELIVERED" ? "success" : "warning"}>
                      {ORDER_STATUS_LABELS[o.status]}
                    </Badge>
                  </button>
                  <a
                    href={`/api/invoice/${o.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Print this invoice"
                    aria-label={`Print invoice for order ${o.id}`}
                    className="shrink-0 rounded-md p-2 text-fg-quaternary outline-focus-ring transition-colors hover:bg-primary_hover hover:text-fg-secondary_hover focus-visible:outline-2"
                  >
                    <Printer className="size-4" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
