"use client";

import { useMemo, useState } from "react";
import { Printer } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import { CATEGORIES, CATEGORY_LABELS, UNIT_LABELS, formatDateStr } from "@/lib/format";
import type { Category, Unit } from "@/db/schema";

type ProductTotal = {
  productId: number | null;
  name: string;
  category: Category | null;
  unit: string;
  needed: number;
  vendors: number;
};

type VendorOrder = {
  orderId: number;
  vendorName: string;
  address: string | null;
  phone: string | null;
  status: string;
  items: { name: string; unit: string; qty: number }[];
};

export default function ManifestClient({
  windowDate,
  productTotals,
  vendorItems,
}: {
  windowDate: string;
  productTotals: ProductTotal[];
  vendorItems: VendorOrder[];
}) {
  const [cat, setCat] = useState<string>("ALL");
  const totals = useMemo(
    () => productTotals.filter((p) => cat === "ALL" || p.category === cat),
    [productTotals, cat],
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-display-xs font-semibold text-primary">
            Purchase — what to buy for {formatDateStr(windowDate)}
          </h1>
          <p className="mt-1 text-sm text-tertiary">
            Billed orders only · unbilled orders don&apos;t count until finalized in Billing.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <form className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              aria-label="Purchase date"
              defaultValue={windowDate}
              className="h-9 w-44 rounded-lg bg-primary px-2 text-sm text-primary shadow-xs ring-1 ring-primary outline-focus-ring ring-inset focus-visible:outline-2"
            />
            <Button size="sm" color="secondary" type="submit">
              View
            </Button>
          </form>
          <Button
            size="sm"
            color="secondary"
            href={`/api/manifest/pdf?date=${windowDate}`}
            iconLeading={Printer}
            {...{ target: "_blank", rel: "noopener noreferrer" }}
          >
            PDF
          </Button>
          <Button size="sm" color="secondary" iconLeading={Printer} onClick={() => window.print()}>
            Print
          </Button>
        </div>
      </div>

      <section className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-md font-semibold text-primary">
            What to buy / prepare ({totals.length} products)
          </h2>
          <Tabs
            selectedKey={cat}
            onSelectionChange={(k) => setCat(String(k))}
          >
            <TabList type="button-gray" size="sm" aria-label="Filter by category">
              <Tab id="ALL" label="All" />
              {CATEGORIES.map((c) => (
                <Tab key={c} id={c} label={CATEGORY_LABELS[c]} />
              ))}
            </TabList>
          </Tabs>
        </div>
        {totals.length === 0 ? (
          <p className="mt-2 text-sm text-tertiary">
            Nothing in this category — finalize orders in Billing first.
          </p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-120 text-sm">
              <thead>
                <tr className="border-b-2 border-secondary text-left text-xs text-quaternary">
                  {["Product", "Total needed", "Vendors"].map((h) => (
                    <th key={h} className="px-2 py-2 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {totals.map((p) => (
                  <tr
                    key={`${p.productId ?? "deleted"}-${p.name}-${p.unit}`}
                    className="border-b border-secondary last:border-0"
                  >
                    <td className="px-2 py-2 font-semibold text-primary">{p.name}</td>
                    <td className="px-2 py-2 whitespace-nowrap text-tertiary">
                      {p.needed} {UNIT_LABELS[p.unit as Unit]}
                    </td>
                    <td className="px-2 py-2 text-tertiary">{p.vendors}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <h2 className="text-md font-semibold text-primary">
        Per-retailer delivery list ({vendorItems.length})
      </h2>
      <ul className="flex flex-col gap-2">
        {vendorItems.map((o) => (
          <li key={o.orderId} className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-primary">{o.vendorName}</p>
              <span className="text-xs text-quaternary">{o.status}</span>
            </div>
            <p className="mt-0.5 text-sm text-tertiary">
              {o.address ?? "no address"} · {o.phone ?? "no phone"}
            </p>
            <ul className="mt-1.5 flex flex-col gap-0.5">
              {o.items.map((it, idx) => (
                <li key={idx} className="text-sm text-secondary">
                  • {it.name}: {it.qty} {UNIT_LABELS[it.unit as Unit]}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}
