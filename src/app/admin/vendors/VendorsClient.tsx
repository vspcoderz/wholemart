"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit01, Plus, Trash01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { TextArea } from "@/components/base/textarea/textarea";
import { Select } from "@/components/base/select/select";
import { Modal, ModalOverlay } from "@/components/application/modals/modal";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import {
  saveVendor,
  toggleVendor,
  deleteVendor,
  type VendorInput,
} from "@/lib/actions/admin";
import type { Tier } from "@/db/schema";
import { TIERS, TIER_LABELS, TIER_RANK, inr } from "@/lib/format";
import { cx } from "@/utils/cx";

type Row = {
  id: number;
  email: string;
  businessName: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  active: boolean;
  orderCount: number;
  balance: number;
  tier: Tier;
};

const EMPTY: VendorInput = {
  email: "",
  password: "",
  businessName: "",
  contactPerson: "",
  phone: "",
  address: "",
  active: true,
  tier: "TIER_3",
};

function toEditing(v: Row): VendorInput {
  return {
    id: v.id,
    email: v.email,
    businessName: v.businessName,
    contactPerson: v.contactPerson ?? "",
    phone: v.phone ?? "",
    address: v.address ?? "",
    active: v.active,
    tier: v.tier,
    password: "",
  };
}

export default function VendorsClient({ vendors }: { vendors: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<VendorInput | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState("ALL");
  const [sort, setSort] = useState("tier");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = vendors.filter(
      (v) =>
        (active === "ALL" || (active === "ACTIVE" ? v.active : !v.active)) &&
        (q === "" ||
          v.businessName.toLowerCase().includes(q) ||
          v.email.toLowerCase().includes(q) ||
          (v.phone ?? "").includes(q)),
    );
    rows.sort((a, b) => {
      if (sort === "orders") return b.orderCount - a.orderCount;
      if (sort === "balance") return b.balance - a.balance;
      if (sort === "tier")
        return (
          TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
          a.businessName.localeCompare(b.businessName)
        );
      return a.businessName.localeCompare(b.businessName);
    });
    return rows;
  }, [vendors, query, active, sort]);

  function doDelete(v: Row) {
    startTransition(async () => {
      const res = await deleteVendor(v.id, true);
      setDeleting(null);
      setToast(
        res.ok ? { msg: "Retailer deleted.", ok: true } : { msg: "Delete failed.", ok: false },
      );
      router.refresh();
    });
  }

  function flipActive(v: Row) {
    startTransition(async () => {
      await toggleVendor(v.id, !v.active);
      router.refresh();
    });
  }

  function submit() {
    if (!editing) return;
    startTransition(async () => {
      const res = await saveVendor(editing);
      if (res.ok) {
        setEditing(null);
        setToast({ msg: "Retailer saved.", ok: true });
        router.refresh();
      } else {
        setToast({ msg: res.error ?? "Save failed.", ok: false });
      }
    });
  }

  const editAction = (v: Row) => (
    <>
      <button
        type="button"
        aria-label={`Edit ${v.businessName}`}
        onClick={() => setEditing(toEditing(v))}
        className="rounded-md p-2 text-fg-quaternary outline-focus-ring transition-colors hover:bg-primary_hover hover:text-fg-secondary_hover focus-visible:outline-2"
      >
        <Edit01 className="size-4" />
      </button>
      <button
        type="button"
        aria-label={`Delete ${v.businessName}`}
        onClick={() => setDeleting(v)}
        className="rounded-md p-2 text-fg-quaternary outline-focus-ring transition-colors hover:bg-error-primary hover:text-error-primary_hover focus-visible:outline-2"
      >
        <Trash01 className="size-4" />
      </button>
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-md font-semibold text-primary">Retailers ({visible.length})</h2>
          <p className="mt-0.5 text-sm text-tertiary">
            Create an account here and hand the credentials to the retailer — vendors can&apos;t
            sign themselves up.
          </p>
        </div>
        <Button size="md" color="primary" iconLeading={Plus} onClick={() => setEditing({ ...EMPTY })}>
          Add retailer
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="min-w-40 flex-1">
          <Input
            size="md"
            aria-label="Search retailers"
            placeholder="Search name, email, phone"
            value={query}
            onChange={(v: string) => setQuery(v)}
          />
        </div>
        <div className="w-32">
          <Select
            size="md"
            aria-label="Status"
            items={[
              { id: "ALL", label: "All" },
              { id: "ACTIVE", label: "Active" },
              { id: "DISABLED", label: "Disabled" },
            ]}
            selectedKey={active}
            onSelectionChange={(k) => setActive(String(k))}
          >
            {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
          </Select>
        </div>
        <div className="w-40">
          <Select
            size="md"
            aria-label="Sort"
            items={[
              { id: "tier", label: "Rank (VIP first)" },
              { id: "name", label: "Name A–Z" },
              { id: "orders", label: "Most orders" },
              { id: "balance", label: "Highest dues" },
            ]}
            selectedKey={sort}
            onSelectionChange={(k) => setSort(String(k))}
          >
            {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
          </Select>
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState size="md">
          <EmptyState.FeaturedIcon color="gray" />
          <EmptyState.Title>No retailers match</EmptyState.Title>
          <EmptyState.Description>Add one, or clear the search.</EmptyState.Description>
        </EmptyState>
      ) : (
        <>
          {/* Desktop table */}
          <div className="overflow-x-auto rounded-xl bg-primary shadow-xs ring-1 ring-secondary max-md:hidden">
            <table className="w-full min-w-180 text-sm">
              <thead>
                <tr className="bg-secondary text-left text-xs text-quaternary">
                  {["Business", "Rank", "Contact", "Orders", "Owes", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 font-semibold first:pl-6 last:pr-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((v) => (
                  <tr key={v.id} className="border-t border-secondary">
                    <td className="px-4 py-3 first:pl-6">
                      <p className="font-semibold text-primary">{v.businessName}</p>
                      <p className="text-xs text-tertiary">{v.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge size="sm" type="pill-color" color={v.tier === "VIP" ? "warning" : "gray"}>
                        {TIER_LABELS[v.tier]}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-tertiary">
                      {v.contactPerson ?? "—"}
                      <span className="block text-xs">{v.phone ?? "no phone"}</span>
                    </td>
                    <td className="px-4 py-3 text-tertiary">{v.orderCount}</td>
                    <td
                      className={cx(
                        "px-4 py-3 text-right",
                        v.balance > 0.004 ? "font-semibold text-primary" : "text-tertiary",
                      )}
                    >
                      {v.balance > 0.004 ? inr(v.balance) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => flipActive(v)} className="cursor-pointer outline-focus-ring focus-visible:outline-2">
                        <Badge size="sm" type="pill-color" color={v.active ? "success" : "gray"}>
                          {v.active ? "Active" : "Disabled"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 last:pr-6">
                      <span className="flex justify-end gap-0.5">{editAction(v)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="flex flex-col gap-1.5 md:hidden">
            {visible.map((v) => (
              <li
                key={v.id}
                className="rounded-xl bg-primary p-3 shadow-xs ring-1 ring-secondary"
              >
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-primary">
                        {v.businessName}
                      </span>
                      <Badge size="sm" type="pill-color" color={v.tier === "VIP" ? "warning" : "gray"}>
                        {TIER_LABELS[v.tier]}
                      </Badge>
                      <button type="button" onClick={() => flipActive(v)} className="cursor-pointer outline-focus-ring focus-visible:outline-2">
                        <Badge size="sm" type="pill-color" color={v.active ? "success" : "gray"}>
                          {v.active ? "Active" : "Disabled"}
                        </Badge>
                      </button>
                    </p>
                    <p className="mt-0.5 truncate text-sm text-tertiary">{v.email}</p>
                    <p className="text-xs text-tertiary">
                      {v.contactPerson ?? "—"} · {v.phone ?? "no phone"} · {v.orderCount} orders
                      {v.balance > 0.004 && ` · owes ${inr(v.balance)}`}
                    </p>
                  </div>
                  <span className="flex shrink-0 gap-0.5">{editAction(v)}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Add / edit */}
      <ModalOverlay isOpen={editing !== null} onOpenChange={(o) => !o && setEditing(null)} isDismissable>
        <Modal className="sm:max-w-lg">
          <div className="max-h-[inherit] overflow-y-auto p-6">
            <h2 className="text-md font-semibold text-primary">
              {editing?.id ? "Edit retailer" : "Add retailer"}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Input
                  size="md"
                  label="Business name"
                  value={editing?.businessName ?? ""}
                  onChange={(v: string) => setEditing((p) => (p ? { ...p, businessName: v } : p))}
                />
              </div>
              <Input
                size="md"
                label="Email (login)"
                type="email"
                value={editing?.email ?? ""}
                onChange={(v: string) => setEditing((p) => (p ? { ...p, email: v } : p))}
              />
              <Input
                size="md"
                label={editing?.id ? "New password (blank = keep)" : "Password"}
                type="password"
                value={editing?.password ?? ""}
                onChange={(v: string) => setEditing((p) => (p ? { ...p, password: v } : p))}
              />
              <Input
                size="md"
                label="Contact person"
                value={editing?.contactPerson ?? ""}
                onChange={(v: string) => setEditing((p) => (p ? { ...p, contactPerson: v } : p))}
              />
              <Input
                size="md"
                label="Phone (for WhatsApp bills)"
                type="tel"
                value={editing?.phone ?? ""}
                onChange={(v: string) => setEditing((p) => (p ? { ...p, phone: v } : p))}
              />
              <div className="sm:col-span-2">
                <TextArea
                  label="Delivery address"
                  value={editing?.address ?? ""}
                  onChange={(v: string) => setEditing((p) => (p ? { ...p, address: v } : p))}
                  rows={2}
                />
              </div>
              <div className="sm:col-span-2">
                <Select
                  size="md"
                  label="Rank"
                  hint="VIP bills first — rank drives billing order and sorting."
                  items={TIERS.map((t) => ({ id: t, label: TIER_LABELS[t] }))}
                  selectedKey={editing?.tier ?? "TIER_3"}
                  onSelectionChange={(k) =>
                    setEditing((p) => (p ? { ...p, tier: String(k) as Tier } : p))
                  }
                >
                  {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
                </Select>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="md" color="secondary" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button size="md" color="primary" isLoading={pending} onClick={submit}>
                Save
              </Button>
            </div>
          </div>
        </Modal>
      </ModalOverlay>

      {/* Delete confirm */}
      <ModalOverlay isOpen={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} isDismissable>
        <Modal className="sm:max-w-md">
          <div className="p-6">
            <h2 className="text-md font-semibold text-primary">
              Delete “{deleting?.businessName}”?
            </h2>
            <p className="mt-1 text-sm text-tertiary">
              {deleting && deleting.orderCount > 0
                ? `Their ${deleting.orderCount} order(s) and invoices will be permanently deleted.`
                : "This cannot be undone."}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button size="md" color="secondary" onClick={() => setDeleting(null)}>
                Keep
              </Button>
              <Button
                size="md"
                color="primary-destructive"
                isLoading={pending}
                onClick={() => deleting && doDelete(deleting)}
              >
                Delete
              </Button>
            </div>
          </div>
        </Modal>
      </ModalOverlay>

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
