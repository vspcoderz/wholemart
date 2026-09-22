"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Minus, Plus, SearchLg } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { MultiSelect } from "@/components/base/select/multi-select";
import { Select } from "@/components/base/select/select";
import { Dialog, Modal, ModalOverlay } from "@/components/application/modals/modal";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import type { Tier } from "@/db/schema";
import { TIER_LABELS, TIERS, inr } from "@/lib/format";
import { recordAdjustment, recordPayment } from "@/lib/actions/accounting";
import { cx } from "@/utils/cx";

export type RetailerBalance = {
  id: number;
  businessName: string;
  phone: string | null;
  active: boolean;
  balance: number;
  tier: Tier;
};

export type LedgerRow = {
  id: number;
  vendorId: number;
  type: "CHARGE" | "PAYMENT" | "ADJUSTMENT";
  amount: number;
  note: string | null;
  orderId: number | null;
  createdAt: string;
};

const TXN_LABEL: Record<LedgerRow["type"], string> = {
  CHARGE: "Billed",
  PAYMENT: "Paid",
  ADJUSTMENT: "Adjusted",
};

const TXN_BADGE: Record<LedgerRow["type"], "warning" | "success" | "blue"> = {
  CHARGE: "warning",
  PAYMENT: "success",
  ADJUSTMENT: "blue",
};

type ModalState = { retailerId: number; mode: "add" | "remove" };

function formatTxnDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

function MoneyModal({
  retailer,
  mode,
  onClose,
  notify,
}: {
  retailer: RetailerBalance;
  mode: "add" | "remove";
  onClose: () => void;
  notify: (msg: string, ok: boolean) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;
  const after =
    mode === "add" ? retailer.balance + (valid ? value : 0) : retailer.balance - (valid ? value : 0);

  function confirm() {
    if (!valid) return;
    startTransition(async () => {
      const res =
        mode === "add"
          ? await recordAdjustment(retailer.id, value, note || "Extra charge")
          : await recordPayment(retailer.id, value, note || "Payment received");
      if (res.ok) {
        notify(
          mode === "add" ? `Added ${inr(value)} to dues.` : `Recorded ${inr(value)} received.`,
          true,
        );
        onClose();
        router.refresh();
      } else {
        notify(res.error, false);
      }
    });
  }

  return (
    <ModalOverlay isOpen onOpenChange={(open) => !open && onClose()} isDismissable>
      <Modal className="sm:max-w-md">
        <Dialog className="p-6">
          <h2 className="text-md font-semibold text-primary">
            {mode === "add" ? "Add to dues" : "Record payment"} — {retailer.businessName}
          </h2>
          <p className="mt-1 text-sm text-tertiary">
            Owes now: {inr(retailer.balance)}
            {valid && (
              <>
                {" → "}
                <strong className="text-primary">{inr(after)}</strong>
              </>
            )}
          </p>
          <div className="mt-4 flex flex-col gap-3">
            <Input
              size="md"
              aria-label="Amount in rupees"
              placeholder="Amount ₹"
              value={amount}
              onChange={(v) => setAmount(v.replace(/[^0-9.]/g, ""))}
              autoFocus
            />
            <TextArea
              aria-label="Note"
              placeholder={mode === "add" ? "Reason (e.g. crate deposit)" : "Note (e.g. cash, UPI ref)"}
              value={note}
              onChange={(v: string) => setNote(v)}
              rows={2}
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button size="md" color="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="md"
              color="primary"
              isLoading={pending}
              isDisabled={pending || !valid}
              onClick={confirm}
            >
              {mode === "add" ? `Add ${valid ? inr(value) : ""}` : `Record ${valid ? inr(value) : ""}`}
            </Button>
          </div>
        </Dialog>
      </Modal>
    </ModalOverlay>
  );
}

export default function AccountingClient({
  outstanding,
  activeRetailerId,
  activeLedger,
  retailers,
  recent,
}: {
  outstanding: number;
  activeRetailerId: number | null;
  activeLedger: LedgerRow[];
  retailers: RetailerBalance[];
  recent: LedgerRow[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [tiers, setTiers] = useState<Tier[]>([]);
  const [dueFilter, setDueFilter] = useState("owing");
  const [sort, setSort] = useState("balance");
  const [modal, setModal] = useState<ModalState | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = retailers.filter(
      (r) =>
        (tiers.length === 0 || tiers.includes(r.tier)) &&
        (dueFilter === "all" ||
          (dueFilter === "owing" ? r.balance > 0 : r.balance <= 0)) &&
        (q === "" ||
          r.businessName.toLowerCase().includes(q) ||
          (r.phone ?? "").replace(/\D/g, "").includes(q.replace(/\D/g, ""))),
    );
    rows.sort((a, b) => {
      if (sort === "vendor") return a.businessName.localeCompare(b.businessName);
      if (sort === "tier")
        return TIERS.indexOf(a.tier) - TIERS.indexOf(b.tier) || b.balance - a.balance;
      return b.balance - a.balance;
    });
    return rows;
  }, [retailers, query, tiers, dueFilter, sort]);

  // Workbench selection follows the URL (?retailer=), defaulting to top dues.
  const selected =
    visible.find((r) => r.id === activeRetailerId) ?? visible[0] ?? null;

  function select(id: number) {
    router.replace(`${pathname}?retailer=${id}`, { scroll: false });
  }

  const ledger = useMemo(() => {
    if (!selected) return [];
    if (selected.id === activeRetailerId) return activeLedger;
    const m = new Map<number, LedgerRow[]>();
    for (const t of recent) {
      const list = m.get(t.vendorId) ?? [];
      if (list.length < 3) list.push(t);
      m.set(t.vendorId, list);
    }
    return m.get(selected.id) ?? [];
  }, [selected, activeRetailerId, activeLedger, recent]);

  const fullLedger = selected !== null && selected.id === activeRetailerId;
  const owingCount = retailers.filter((r) => r.balance > 0).length;
  const modalRetailer = modal ? retailers.find((r) => r.id === modal.retailerId) : undefined;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-display-xs font-semibold text-primary">Accounting</h1>
        <p className="mt-1 text-sm text-tertiary">
          Pick a retailer, review the ledger, collect or charge — same flow as Billing.
        </p>
        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
          <div className="flex items-baseline gap-1.5">
            <dt className="text-xs text-quaternary">Outstanding</dt>
            <dd className="text-sm font-semibold text-primary">{inr(outstanding)}</dd>
          </div>
          <div className="flex items-baseline gap-1.5">
            <dt className="text-xs text-quaternary">Owing retailers</dt>
            <dd className="text-sm font-semibold text-primary">{owingCount}</dd>
          </div>
        </dl>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-12">
        {/* ---------- Retailer selection ---------- */}
        <section className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary lg:col-span-5">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="min-w-35 flex-1">
              <Input
                size="md"
                aria-label="Search retailer or phone"
                placeholder="Search retailer / phone"
                icon={SearchLg}
                value={query}
                onChange={(v) => setQuery(v)}
              />
            </div>
            <div className="w-30">
              <Select
                size="md"
                aria-label="Dues filter"
                items={[
                  { id: "owing", label: "Owing" },
                  { id: "settled", label: "Settled" },
                  { id: "all", label: "All" },
                ]}
                selectedKey={dueFilter}
                onSelectionChange={(k) => setDueFilter(String(k))}
              >
                {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
              </Select>
            </div>
            <div className="w-30">
              <Select
                size="md"
                aria-label="Sort retailers"
                items={[
                  { id: "balance", label: "Highest dues" },
                  { id: "vendor", label: "Name" },
                  { id: "tier", label: "Rank" },
                ]}
                selectedKey={sort}
                onSelectionChange={(k) => setSort(String(k))}
              >
                {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
              </Select>
            </div>
          </div>
          <div className="mb-2">
            <MultiSelect
              size="md"
              placeholder="All ranks"
              selectedCountFormatter={(n) => `${n} rank${n === 1 ? "" : "s"}`}
              items={TIERS.map((t) => ({ id: t, label: TIER_LABELS[t] }))}
              selectedKeys={new Set(tiers)}
              showFooter={false}
              onSelectionChange={(sel) =>
                setTiers(sel === "all" ? [...TIERS] : ([...sel].map(String) as Tier[]))
              }
            >
              {(item) => <MultiSelect.Item key={item.id} id={String(item.id)} label={item.label} />}
            </MultiSelect>
          </div>
          {visible.length === 0 ? (
            <EmptyState size="md">
              <EmptyState.FeaturedIcon color="gray" />
              <EmptyState.Title>No retailers match</EmptyState.Title>
              <EmptyState.Description>Try a different search or filter.</EmptyState.Description>
            </EmptyState>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {visible.map((r) => {
                const on = selected?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => select(r.id)}
                      aria-pressed={on}
                      className={cx(
                        "flex w-full cursor-pointer items-center gap-2.5 rounded-lg p-2.5 text-left ring-1 outline-focus-ring transition-colors ring-inset focus-visible:outline-2",
                        on ? "bg-brand-primary ring-brand" : "bg-primary ring-secondary hover:bg-primary_hover",
                      )}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate text-sm font-semibold text-primary">
                            {r.businessName}
                          </span>
                          <Badge size="sm" type="pill-color" color={r.tier === "VIP" ? "warning" : "gray"}>
                            {TIER_LABELS[r.tier]}
                          </Badge>
                          {!r.active && (
                            <Badge size="sm" type="pill-color" color="gray">
                              Inactive
                            </Badge>
                          )}
                        </span>
                        <span className="mt-0.5 block text-sm text-tertiary">
                          Owes {inr(r.balance)}
                          {r.phone ? ` · ${r.phone}` : ""}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 text-xs text-tertiary">
            <strong className="text-secondary">Collect</strong> = money received, dues go down.{" "}
            <strong className="text-secondary">Charge</strong> = extra charge, dues go up.
          </p>
        </section>

        {/* ---------- Ledger + actions ---------- */}
        <section className="flex flex-col gap-4 lg:col-span-7">
          {!selected ? (
            <EmptyState size="md">
              <EmptyState.FeaturedIcon color="gray" />
              <EmptyState.Title>No retailer selected</EmptyState.Title>
            </EmptyState>
          ) : (
            <>
              <div className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h2 className="flex flex-wrap items-center gap-1.5 text-md font-semibold text-primary">
                      {selected.businessName}
                      <Badge size="sm" type="pill-color" color={selected.tier === "VIP" ? "warning" : "gray"}>
                        {TIER_LABELS[selected.tier]}
                      </Badge>
                    </h2>
                    <p className="mt-0.5 text-sm text-tertiary">
                      {selected.phone ?? "no phone"}
                    </p>
                    <p className="mt-1 text-display-xs font-bold text-primary">
                      {inr(selected.balance)}
                      <span className="ml-2 align-middle text-xs font-normal text-quaternary">
                        outstanding
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      size="md"
                      color="secondary"
                      iconLeading={Minus}
                      onClick={() => setModal({ retailerId: selected.id, mode: "remove" })}
                      isDisabled={selected.balance <= 0}
                    >
                      Collect
                    </Button>
                    <Button
                      size="md"
                      color="primary"
                      iconLeading={Plus}
                      onClick={() => setModal({ retailerId: selected.id, mode: "add" })}
                    >
                      Charge
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
                <h3 className="text-md font-semibold text-primary">
                  Ledger {fullLedger ? `(${ledger.length})` : "(recent)"}
                </h3>
                {ledger.length === 0 ? (
                  <p className="mt-2 text-sm text-tertiary">No entries yet.</p>
                ) : (
                  <ul className="mt-2 flex flex-col">
                    {ledger.map((t) => (
                      <li
                        key={t.id}
                        className="flex items-center justify-between gap-2 border-t border-secondary py-2.5 first:border-0 first:pt-0"
                      >
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-1.5">
                            <Badge size="sm" type="pill-color" color={TXN_BADGE[t.type]}>
                              {TXN_LABEL[t.type]}
                            </Badge>
                            <span className="truncate text-sm text-secondary">
                              {t.note ?? ""}
                            </span>
                          </p>
                          <p className="mt-0.5 text-xs text-tertiary">
                            {formatTxnDate(t.createdAt)}
                            {t.orderId ? (
                              <>
                                {" · "}
                                <Link
                                  href={`/admin/orders/${t.orderId}`}
                                  className="text-brand-secondary hover:underline"
                                >
                                  order #{t.orderId}
                                </Link>
                              </>
                            ) : null}
                          </p>
                        </div>
                        <span
                          className={cx(
                            "shrink-0 text-sm font-semibold",
                            t.amount >= 0 ? "text-warning-primary" : "text-success-primary",
                          )}
                        >
                          {t.amount >= 0 ? "+" : "−"}
                          {inr(Math.abs(t.amount))}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <Link
                  href={`/admin/orders?tab=outstanding&retailers=${selected.id}`}
                  className="mt-2 inline-block text-sm font-semibold text-brand-secondary hover:underline"
                >
                  Full money trail in Reports →
                </Link>
              </div>
            </>
          )}
        </section>
      </div>

      {modal && modalRetailer && (
        <MoneyModal
          key={`${modal.retailerId}:${modal.mode}`}
          retailer={modalRetailer}
          mode={modal.mode}
          onClose={() => setModal(null)}
          notify={(msg, ok) => setToast({ msg, ok })}
        />
      )}

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
    </div>
  );
}
