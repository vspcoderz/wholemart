"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "@untitledui/icons";
import { Button } from "@/components/base/buttons/button";
import type { Unit } from "@/db/schema";
import { UNIT_LABELS, UNIT_STEPS } from "@/lib/format";
import { useCart } from "@/components/cart/CartProvider";
import { useLang } from "@/lib/i18n";
import { saveOrder } from "@/lib/actions/orders";
import { cx } from "@/utils/cx";

type CartProduct = { id: number; name: string; nameMr: string | null; emoji: string | null; unit: Unit };

export default function CartClient({
  catalog,
  windowOpen,
}: {
  catalog: CartProduct[];
  windowOpen: boolean;
}) {
  const router = useRouter();
  const { items, setQty, clear: cartClear } = useCart();
  const { t, lang } = useLang();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const tt = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(tt);
  }, [toast]);

  const rows = [
    ...new Map(
      items
        .map((i) => {
          const p = catalog.find((c) => c.id === i.productId);
          return p ? { ...p, quantity: i.quantity } : null;
        })
        .filter((r): r is CartProduct & { quantity: number } => r !== null)
        .map((r) => [r.id, r]),
    ).values(),
  ];

  const itemCount = rows.length;

  function submit() {
    startTransition(async () => {
      const res = await saveOrder(items.filter((i) => i.quantity > 0));
      if (res.ok) {
        cartClear();
        setToast({ msg: t("orderSaved"), ok: true });
        router.push("/vendor/orders");
      } else {
        setToast({ msg: res.error, ok: false });
      }
    });
  }

  if (rows.length === 0) {
    return (
      <div className="mt-2 rounded-xl bg-primary p-8 text-center ring-1 ring-secondary">
        <p className="mb-4 text-sm text-tertiary">{t("emptyCart")}</p>
        <Button size="md" color="primary" onClick={() => router.push("/vendor")}>
          {t("browse")}
        </Button>
      </div>
    );
  }

  return (
    <div className="pb-2">
      <h1 className="mb-2 text-md font-semibold text-primary">{t("cart")}</h1>

      <ul className="flex flex-col gap-1.5">
        {rows.map((r) => (
          <li
            key={r.id}
            className="flex items-center gap-3 rounded-xl bg-primary p-3 shadow-xs ring-1 ring-secondary"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-secondary text-2xl">
              {r.emoji ?? "🥬"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-semibold text-primary">
                {lang === "mr" && r.nameMr ? r.nameMr : r.name}
              </span>
              <span className="block text-sm text-tertiary">per {UNIT_LABELS[r.unit]}</span>
            </span>
            <span className="flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                aria-label={`Reduce ${r.name}`}
                disabled={!windowOpen}
                onClick={() => setQty(r.id, Math.max(0, r.quantity - (UNIT_STEPS[r.unit] ?? 1)))}
                className="grid size-9 cursor-pointer place-items-center rounded-lg text-fg-quaternary ring-1 ring-secondary outline-focus-ring ring-inset transition-colors hover:bg-primary_hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2"
              >
                <Minus className="size-4" />
              </button>
              <span className="min-w-8.5 text-center text-sm font-bold text-primary">
                {r.quantity}
              </span>
              <button
                type="button"
                aria-label={`Add more ${r.name}`}
                disabled={!windowOpen}
                onClick={() => setQty(r.id, r.quantity + (UNIT_STEPS[r.unit] ?? 1))}
                className="grid size-9 cursor-pointer place-items-center rounded-lg bg-brand-solid text-white outline-focus-ring transition-colors hover:bg-brand-solid_hover disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2"
              >
                <Plus className="size-4" />
              </button>
            </span>
          </li>
        ))}
      </ul>

      <p className="px-0.5 py-3 text-md text-primary">
        {itemCount} {itemCount === 1 ? "item" : "items"} ({t("payOnDelivery")})
      </p>

      {windowOpen ? (
        <div className="flex gap-2">
          <Button
            size="lg"
            color="primary"
            className="flex-1"
            isLoading={pending}
            onClick={submit}
          >
            {t("saveOrder")}
          </Button>
          <Button
            size="lg"
            color="secondary-destructive"
            onClick={() => {
              cartClear();
              router.refresh();
            }}
          >
            {t("clear")}
          </Button>
        </div>
      ) : (
        <p className="rounded-lg bg-warning-primary p-3 text-sm font-medium text-warning-primary ring-1 ring-utility-yellow-200 ring-inset">
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
          {toast.msg}
        </div>
      )}
    </div>
  );
}
