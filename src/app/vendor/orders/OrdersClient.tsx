"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AnnotationInfo, ClockRefresh, Download01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import {
  ORDER_STATUS_LABELS,
  formatDateStr,
  inr,
} from "@/lib/format";
import { repeatOrder } from "@/lib/actions/orders";
import { useCart } from "@/components/cart/CartProvider";
import { useLang } from "@/lib/i18n";
import { cx } from "@/utils/cx";

type OrderRow = {
  id: number;
  windowDate: string;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  adminNote: string | null;
  itemCount: number;
  total: number;
  currentWindow: boolean;
};

const STATUS_BADGE: Record<OrderRow["status"], "blue" | "warning" | "success" | "gray"> = {
  PLACED: "blue",
  CONFIRMED: "warning",
  DELIVERED: "success",
  CANCELLED: "gray",
};

export default function OrdersClient({
  orders,
  currentWindowOpen,
}: {
  orders: OrderRow[];
  currentWindowOpen: boolean;
}) {
  const router = useRouter();
  const { replaceAll } = useCart();
  const { t } = useLang();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const tt = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(tt);
  }, [toast]);

  function repeat(o: OrderRow) {
    startTransition(async () => {
      const res = await repeatOrder(o.id);
      if (res.ok) {
        replaceAll(res.items);
        router.push("/vendor/cart");
      } else {
        setToast({ msg: res.error ?? "Could not repeat order.", ok: false });
      }
    });
  }

  if (orders.length === 0) {
    return (
      <EmptyState size="md">
        <EmptyState.FeaturedIcon color="gray" />
        <EmptyState.Title>{t("noOrders")}</EmptyState.Title>
      </EmptyState>
    );
  }

  return (
    <div className="pb-2">
      <h1 className="mb-2 text-md font-semibold text-primary">{t("myOrders")}</h1>

      <ul className="flex flex-col gap-1.5">
        {orders.map((o) => (
          <li
            key={o.id}
            className="rounded-xl bg-primary p-3.5 shadow-xs ring-1 ring-secondary"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-primary">
                  {formatDateStr(o.windowDate)} {t("windowLabel")}
                  {o.currentWindow && (
                    <Badge size="sm" type="pill-color" color="brand">
                      {t("current")}
                    </Badge>
                  )}
                </p>
                <p className="mt-0.5 text-sm text-tertiary">
                  {o.itemCount} {t("items")} · {t("payOnDelivery")}
                  {(o.status === "CONFIRMED" || o.status === "DELIVERED") &&
                    ` · ${inr(o.total)}`}
                </p>
              </div>
              <Badge size="sm" type="pill-color" color={STATUS_BADGE[o.status]}>
                {ORDER_STATUS_LABELS[o.status]}
              </Badge>
            </div>

            {o.adminNote && (
              <p className="mt-2 flex items-start gap-1.5 text-sm text-secondary">
                <AnnotationInfo className="mt-0.5 size-4 shrink-0 text-fg-quaternary" />
                <span>
                  <strong>{t("noteFromSupplier")}</strong> {o.adminNote}
                </span>
              </p>
            )}

            <div className="mt-2.5 flex gap-2">
              <Button
                size="sm"
                color="secondary"
                href={`/api/invoice/${o.id}`}
                iconLeading={Download01}
                {...{ target: "_blank", rel: "noopener noreferrer" }}
              >
                {t("invoicePdf")}
              </Button>
              {currentWindowOpen && o.status === "PLACED" && (
                <Button
                  size="sm"
                  color="secondary"
                  iconLeading={ClockRefresh}
                  isLoading={pending}
                  onClick={() => repeat(o)}
                >
                  {t("repeatInCart")}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>

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
