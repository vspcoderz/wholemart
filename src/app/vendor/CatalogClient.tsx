"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, SearchLg, ShoppingCart02 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import type { Category, Unit } from "@/db/schema";
import { CATEGORIES, UNIT_LABELS, UNIT_STEPS } from "@/lib/format";
import { useCart } from "@/components/cart/CartProvider";
import { useLang, type StringKey } from "@/lib/i18n";
import { saveOrder } from "@/lib/actions/orders";
import { cx } from "@/utils/cx";

export type CatalogProduct = {
  id: number;
  name: string;
  nameMr: string | null;
  emoji: string | null;
  category: Category;
  unit: Unit;
  imageUrl: string | null;
};

const CAT_KEY: Record<Category, StringKey> = {
  LOCAL_VEG: "catLocal",
  ENGLISH_VEG: "catEnglish",
  FRUITS: "catFruits",
};

const TILE_BG: Record<Category, string> = {
  LOCAL_VEG: "bg-utility-green-100",
  ENGLISH_VEG: "bg-utility-sky-100",
  FRUITS: "bg-utility-orange-100",
};

function stepFor(unit: Unit) {
  return UNIT_STEPS[unit] ?? 1;
}

function roundQty(unit: Unit, v: number) {
  return unit === "G" ? Math.round(v) : Math.round(v * 100) / 100;
}

export default function CatalogClient({
  catalog,
  windowOpen,
}: {
  catalog: CatalogProduct[];
  windowOpen: boolean;
}) {
  const router = useRouter();
  const { items, setQty, clear } = useCart();
  const { t, lang } = useLang();
  const [tab, setTab] = useState<"ALL" | Category>("ALL");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const tt = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(tt);
  }, [toast]);

  const qtyOf = (id: number) => items.find((i) => i.productId === id)?.quantity ?? 0;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return catalog.filter(
      (p) =>
        (tab === "ALL" || p.category === tab) &&
        (!q || p.name.toLowerCase().includes(q) || (p.nameMr ?? "").includes(search.trim())),
    );
  }, [catalog, tab, search]);

  const totalItems = items.reduce((n, i) => n + (i.quantity > 0 ? 1 : 0), 0);

  function change(p: CatalogProduct, next: number) {
    setQty(p.id, next <= 0 ? 0 : roundQty(p.unit, next));
  }

  // Tap anywhere on the card = quick add (+1 step)
  function quickAdd(p: CatalogProduct) {
    if (!windowOpen) return;
    const q = qtyOf(p.id);
    change(p, q === 0 ? Math.max(stepFor(p.unit), 1) : q + stepFor(p.unit));
  }

  function placeOrUpdate() {
    startTransition(async () => {
      const res = await saveOrder(items.filter((i) => i.quantity > 0));
      if (res.ok) {
        clear();
        setToast({ msg: t("orderSaved"), ok: true });
        router.refresh();
      } else {
        setToast({ msg: res.error, ok: false });
      }
    });
  }

  const displayName = (p: CatalogProduct) =>
    lang === "mr" && p.nameMr ? p.nameMr : p.name;

  return (
    <div className="pb-2">
      {/* Header: title + cart CTA */}
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-md font-semibold text-primary">{t("newOrder")}</h1>
        <Button
          size="sm"
          color={totalItems > 0 ? "primary" : "secondary"}
          iconLeading={ShoppingCart02}
          onClick={() => router.push("/vendor/cart")}
        >
          {t("cart")}
          {totalItems > 0 ? ` (${totalItems})` : ""}
        </Button>
      </div>

      <div className="mb-2">
        <Input
          size="md"
          aria-label={t("search")}
          placeholder={t("search")}
          icon={SearchLg}
          value={search}
          onChange={(v: string) => setSearch(v)}
        />
      </div>

      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as "ALL" | Category)}>
        <TabList type="underline" size="sm">
          <Tab id="ALL" label={t("all")} />
          {CATEGORIES.map((c) => (
            <Tab key={c} id={c} label={t(CAT_KEY[c])} />
          ))}
        </TabList>
      </Tabs>

      {filtered.length === 0 ? (
        <EmptyState size="md">
          <EmptyState.FeaturedIcon color="gray" />
          <EmptyState.Title>{t("noProducts")}</EmptyState.Title>
        </EmptyState>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {filtered.map((p) => {
            const q = qtyOf(p.id);
            const selected = q > 0;
            return (
              <div
                key={p.id}
                role="button"
                tabIndex={windowOpen ? 0 : -1}
                aria-pressed={selected}
                aria-disabled={!windowOpen}
                onClick={() => quickAdd(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    quickAdd(p);
                  }
                }}
                className={cx(
                  "flex cursor-pointer flex-col overflow-hidden rounded-xl bg-primary shadow-xs ring-2 outline-focus-ring ring-inset transition-transform focus-visible:outline-2 active:scale-[0.98]",
                  selected ? "ring-brand" : "ring-secondary",
                  !windowOpen && "cursor-default active:scale-100",
                )}
              >
                {/* Emoji / image tile — distinct per product */}
                <div className={cx("relative grid h-18 place-items-center", TILE_BG[p.category])}>
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl leading-none">{p.emoji ?? "🥬"}</span>
                  )}
                  {selected && (
                    <Badge
                      size="sm"
                      type="pill-color"
                      color="brand"
                      className="absolute top-1.5 right-1.5"
                    >
                      {q} {UNIT_LABELS[p.unit]}
                    </Badge>
                  )}
                </div>

                <div className="flex flex-1 flex-col p-2">
                  <p className="truncate text-sm leading-tight font-semibold text-primary">
                    {displayName(p)}
                  </p>
                  {lang === "mr" && p.nameMr && (
                    <p className="truncate text-xs text-tertiary">{p.name}</p>
                  )}
                  <div
                    className="mt-1 flex items-center justify-between"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-sm text-tertiary">{UNIT_LABELS[p.unit]}</span>
                    {selected && (
                      <span className="flex items-center gap-0.5">
                        <button
                          type="button"
                          aria-label={`Remove ${p.name}`}
                          onClick={() => change(p, q - stepFor(p.unit))}
                          className="grid size-9 cursor-pointer place-items-center rounded-lg text-fg-quaternary outline-focus-ring transition-colors hover:bg-primary_hover focus-visible:outline-2"
                        >
                          <Minus className="size-4" />
                        </button>
                        <span className="min-w-5.5 text-center text-sm font-bold text-primary">
                          {q}
                        </span>
                        <button
                          type="button"
                          aria-label={`Add ${p.name}`}
                          onClick={() => change(p, q + stepFor(p.unit))}
                          className="grid size-9 cursor-pointer place-items-center rounded-lg bg-brand-solid text-white outline-focus-ring transition-colors hover:bg-brand-solid_hover focus-visible:outline-2"
                        >
                          <Plus className="size-4" />
                        </button>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky review bar */}
      {windowOpen && totalItems > 0 && (
        <div className="sticky bottom-2 z-20 mt-2 flex items-center justify-between gap-2 rounded-xl bg-primary p-3 shadow-lg ring-1 ring-secondary">
          <p className="text-sm font-semibold text-primary">
            {totalItems} {t("itemsSelected")}
          </p>
          <div className="flex gap-2">
            <Button size="sm" color="secondary" onClick={() => router.push("/vendor/cart")}>
              {t("reviewOrder")}
            </Button>
            <Button size="sm" color="primary" isLoading={pending} onClick={placeOrUpdate}>
              {t("saveOrder")}
            </Button>
          </div>
        </div>
      )}

      {!windowOpen && (
        <p className="mt-2 rounded-lg bg-warning-primary p-3 text-sm font-medium text-warning-primary ring-1 ring-utility-yellow-200 ring-inset">
          {t("windowClosed")}
        </p>
      )}

      {toast && (
        <div
          role="status"
          className={cx(
            "fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl p-3.5 text-sm font-medium shadow-lg ring-1 ring-inset",
            toast.ok
              ? "bg-success-solid text-white ring-transparent"
              : "bg-error-solid text-white ring-transparent",
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
    </div>
  );
}
