"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import type { Unit } from "@/db/schema";
import { UNIT_LABELS, inr } from "@/lib/format";
import { adjustOrderItems, setOrderStatus } from "@/lib/actions/admin";
import { cx } from "@/utils/cx";

type EditorItem = {
  id: number;
  name: string;
  unit: Unit;
  quantity: number;
  confirmedQuantity: number | null;
  unitPrice: number;
};

const STATUS_OPTIONS = ["PLACED", "CONFIRMED", "DELIVERED", "CANCELLED"] as const;
const STATUS_LABEL: Record<(typeof STATUS_OPTIONS)[number], string> = {
  PLACED: "Placed",
  CONFIRMED: "Confirm",
  DELIVERED: "Delivered (paid)",
  CANCELLED: "Cancel order",
};

export default function OrderEditor({
  orderId,
  status,
  adminNote,
  items,
}: {
  orderId: number;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  adminNote: string;
  items: EditorItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState(adminNote);
  const [edits, setEdits] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      items.map((i) => [i.id, String(i.confirmedQuantity ?? i.quantity)]),
    ),
  );
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  function save() {
    // Compare against the effective current value (confirmed ?? ordered) so
    // reverting an adjusted line back to its ordered qty actually persists.
    const changed = items
      .map((i) => ({ i, v: Number(edits[i.id]) }))
      .filter(
        ({ i, v }) =>
          Number.isFinite(v) &&
          v >= 0 &&
          v !== (i.confirmedQuantity ?? i.quantity),
      )
      .map(({ i, v }) => ({ itemId: i.id, quantity: v }));
    startTransition(async () => {
      const res = await adjustOrderItems(orderId, note, changed);
      if (res.ok) {
        setToast({ msg: "Adjustments saved. The vendor will see them.", ok: true });
        router.refresh();
      } else {
        setToast({ msg: "Could not save adjustments.", ok: false });
      }
    });
  }

  function setStatus(next: (typeof STATUS_OPTIONS)[number]) {
    startTransition(async () => {
      try {
        await setOrderStatus(orderId, next);
        setToast({ msg: `Order marked ${next.toLowerCase()}.`, ok: true });
        router.refresh();
      } catch {
        setToast({ msg: "Could not change status.", ok: false });
      }
    });
  }

  const newTotal = items.reduce(
    (s, i) => s + Number(edits[i.id] ?? i.quantity) * i.unitPrice,
    0,
  );
  const originalTotal = items.reduce(
    (s, i) => s + (i.confirmedQuantity ?? i.quantity) * i.unitPrice,
    0,
  );

  return (
    <>
      <section className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
        <h2 className="text-md font-semibold text-primary">Items</h2>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-130 text-sm">
            <thead>
              <tr className="text-left text-xs text-quaternary">
                <th className="px-2 py-2 font-semibold">Product</th>
                <th className="px-2 py-2 text-right font-semibold">Ordered</th>
                <th className="w-36 px-2 py-2 text-right font-semibold">Supplied</th>
                <th className="px-2 py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const raw = edits[i.id];
                const q = raw === undefined || raw === "" ? (i.confirmedQuantity ?? i.quantity) : Number(raw);
                const displayQ = Number.isFinite(q) ? q : 0;
                const changed = displayQ !== (i.confirmedQuantity ?? i.quantity);
                return (
                  <tr key={i.id} className="border-t border-secondary">
                    <td className="px-2 py-2">
                      <span className="flex flex-wrap items-center gap-1.5 font-medium text-primary">
                        {i.name}
                        {changed && (
                          <Badge size="sm" type="pill-color" color="warning">
                            adjusted
                          </Badge>
                        )}
                      </span>
                      <span className="block text-xs text-tertiary">
                        {inr(i.unitPrice)} / {UNIT_LABELS[i.unit]}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right whitespace-nowrap text-tertiary">
                      {i.quantity} {UNIT_LABELS[i.unit]}
                    </td>
                    <td className="px-2 py-2">
                      <Input
                        size="sm"
                        aria-label={`Supplied quantity for ${i.name}`}
                        value={edits[i.id] ?? ""}
                        onChange={(v: string) =>
                          setEdits((p) => ({ ...p, [i.id]: v.replace(/[^0-9.]/g, "") }))
                        }
                      />
                    </td>
                    <td className="px-2 py-2 text-right font-semibold text-primary">
                      {inr(displayQ * i.unitPrice)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-right text-sm font-semibold text-primary">
          New total: {inr(newTotal)}
        </p>
        {newTotal !== originalTotal && (
          <p className="block text-right text-xs text-tertiary">
            Current billed total: {inr(originalTotal)}
          </p>
        )}

        <div className="mt-3">
          <TextArea
            label="Note to vendor (stock shortfall, substitution, etc.)"
            value={note}
            onChange={(v: string) => setNote(v)}
            rows={2}
          />
        </div>

        <div className="mt-3">
          <Button size="md" color="primary" isLoading={pending} onClick={save}>
            Save adjustments
          </Button>
        </div>
      </section>

      <section className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
        <h2 className="text-md font-semibold text-primary">Order status</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((s) => (
            <Button
              key={s}
              size="sm"
              color={status === s ? "primary" : "secondary"}
              isDisabled={pending}
              onClick={() => setStatus(s)}
            >
              {STATUS_LABEL[s]}
            </Button>
          ))}
        </div>
      </section>

      {toast && (
        <div
          role="status"
          className={cx(
            "fixed bottom-20 left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl p-3.5 text-sm font-medium shadow-lg ring-1 ring-inset lg:bottom-8",
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
    </>
  );
}
