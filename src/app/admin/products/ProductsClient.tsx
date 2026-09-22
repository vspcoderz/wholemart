"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit01, Eye, EyeOff, Plus, Trash01 } from "@untitledui/icons";
import { Badge } from "@/components/base/badges/badges";
import { Button } from "@/components/base/buttons/button";
import { Input } from "@/components/base/input/input";
import { Select } from "@/components/base/select/select";
import { Toggle } from "@/components/base/toggle/toggle";
import { Modal, ModalOverlay } from "@/components/application/modals/modal";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import type { Category, Unit } from "@/db/schema";
import { CATEGORIES, CATEGORY_LABELS, UNITS, UNIT_LABELS, inr } from "@/lib/format";
import {
  saveProduct,
  toggleProduct,
  deleteProduct,
  type ProductInput,
} from "@/lib/actions/admin";
import { cx } from "@/utils/cx";

type Row = {
  id: number;
  name: string;
  nameMr: string | null;
  emoji: string | null;
  category: Category;
  unit: Unit;
  pricePerUnit: number;
  active: boolean;
  description: string | null;
};

const EMPTY: ProductInput = {
  name: "",
  nameMr: "",
  emoji: "",
  category: "LOCAL_VEG",
  unit: "KG",
  pricePerUnit: 0,
  active: true,
};

function toEditing(p: Row): ProductInput {
  return {
    id: p.id,
    name: p.name,
    nameMr: p.nameMr ?? "",
    emoji: p.emoji ?? "",
    category: p.category,
    unit: p.unit,
    pricePerUnit: p.pricePerUnit,
    description: p.description ?? "",
    active: p.active,
  };
}

export default function ProductsClient({ products }: { products: Row[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState<ProductInput | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState<"ALL" | Category>("ALL");
  const [active, setActive] = useState("ALL");
  const [sort, setSort] = useState("name");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = products.filter(
      (p) =>
        (cat === "ALL" || p.category === cat) &&
        (active === "ALL" || (active === "ACTIVE" ? p.active : !p.active)) &&
        (q === "" ||
          p.name.toLowerCase().includes(q) ||
          (p.nameMr ?? "").includes(query.trim())),
    );
    rows.sort((a, b) => {
      if (sort === "price-desc") return b.pricePerUnit - a.pricePerUnit;
      if (sort === "price-asc") return a.pricePerUnit - b.pricePerUnit;
      return a.name.localeCompare(b.name);
    });
    return rows;
  }, [products, query, cat, active, sort]);

  function submit() {
    if (!editing) return;
    startTransition(async () => {
      const res = await saveProduct(editing);
      if (res.ok) {
        setEditing(null);
        setToast({ msg: "Product saved.", ok: true });
        router.refresh();
      } else {
        setToast({ msg: res.error ?? "Save failed.", ok: false });
      }
    });
  }

  function doDelete(p: Row) {
    startTransition(async () => {
      const res = await deleteProduct(p.id);
      setDeleting(null);
      setToast(
        res.ok
          ? { msg: "Product deleted.", ok: true }
          : { msg: res.error ?? "Delete failed.", ok: false },
      );
      router.refresh();
    });
  }

  function flipActive(p: Row) {
    startTransition(async () => {
      await toggleProduct(p.id, !p.active);
      router.refresh();
    });
  }

  const editAction = (p: Row) => (
    <>
      <button
        type="button"
        aria-label={`Edit ${p.name}`}
        onClick={() => setEditing(toEditing(p))}
        className="rounded-md p-2 text-fg-quaternary outline-focus-ring transition-colors hover:bg-primary_hover hover:text-fg-secondary_hover focus-visible:outline-2"
      >
        <Edit01 className="size-4" />
      </button>
      <button
        type="button"
        aria-label={p.active ? `Hide ${p.name}` : `Show ${p.name}`}
        onClick={() => flipActive(p)}
        className="rounded-md p-2 text-fg-quaternary outline-focus-ring transition-colors hover:bg-primary_hover hover:text-fg-secondary_hover focus-visible:outline-2"
      >
        {p.active ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
      </button>
      <button
        type="button"
        aria-label={`Delete ${p.name}`}
        onClick={() => setDeleting(p)}
        className="rounded-md p-2 text-fg-quaternary outline-focus-ring transition-colors hover:bg-error-primary hover:text-error-primary_hover focus-visible:outline-2"
      >
        <Trash01 className="size-4" />
      </button>
    </>
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-md font-semibold text-primary">Products ({visible.length})</h2>
        <Button size="md" color="primary" iconLeading={Plus} onClick={() => setEditing({ ...EMPTY })}>
          Add product
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="min-w-40 flex-1">
          <Input
            size="md"
            aria-label="Search products"
            placeholder="Search products"
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
              { id: "HIDDEN", label: "Hidden" },
            ]}
            selectedKey={active}
            onSelectionChange={(k) => setActive(String(k))}
          >
            {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
          </Select>
        </div>
        <div className="w-32">
          <Select
            size="md"
            aria-label="Sort"
            items={[
              { id: "name", label: "Name A–Z" },
              { id: "price-desc", label: "Price ↓" },
              { id: "price-asc", label: "Price ↑" },
            ]}
            selectedKey={sort}
            onSelectionChange={(k) => setSort(String(k))}
          >
            {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
          </Select>
        </div>
      </div>

      <Tabs selectedKey={cat} onSelectionChange={(k) => setCat(k as "ALL" | Category)}>
        <TabList type="underline" size="sm">
          <Tab id="ALL" label="All" />
          {CATEGORIES.map((c) => (
            <Tab key={c} id={c} label={CATEGORY_LABELS[c]} />
          ))}
        </TabList>
      </Tabs>

      {visible.length === 0 ? (
        <EmptyState size="md">
          <EmptyState.FeaturedIcon color="gray" />
          <EmptyState.Title>No products match</EmptyState.Title>
          <EmptyState.Description>Add one, or clear the search.</EmptyState.Description>
        </EmptyState>
      ) : (
        <>
          {/* Desktop table */}
          <div className="overflow-x-auto rounded-xl bg-primary shadow-xs ring-1 ring-secondary max-md:hidden">
            <table className="w-full min-w-160 text-sm">
              <thead>
                <tr className="bg-secondary text-left text-xs text-quaternary">
                  {["Name", "Category", "Unit", "Price", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-2.5 font-semibold first:pl-6 last:pr-6">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.id} className="border-t border-secondary">
                    <td className="px-4 py-3 first:pl-6">
                      <p className="font-semibold text-primary">
                        {p.emoji} {p.name}
                      </p>
                      <p className="text-xs text-tertiary">{p.nameMr ?? "—"}</p>
                    </td>
                    <td className="px-4 py-3 text-tertiary">{CATEGORY_LABELS[p.category]}</td>
                    <td className="px-4 py-3 text-tertiary">{UNIT_LABELS[p.unit]}</td>
                    <td className="px-4 py-3 text-right font-semibold text-primary">
                      {inr(p.pricePerUnit)}
                    </td>
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => flipActive(p)} className="cursor-pointer outline-focus-ring focus-visible:outline-2">
                        <Badge size="sm" type="pill-color" color={p.active ? "success" : "gray"}>
                          {p.active ? "Active" : "Hidden"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-4 py-3 last:pr-6">
                      <span className="flex justify-end gap-0.5">{editAction(p)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="flex flex-col gap-1.5 md:hidden">
            {visible.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-2.5 rounded-xl bg-primary p-3 shadow-xs ring-1 ring-secondary"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-secondary text-2xl">
                  {p.emoji ?? "🥬"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-primary">
                    {p.nameMr ? `${p.nameMr} · ${p.name}` : p.name}
                  </span>
                  <span className="mt-0.5 block text-sm text-tertiary">
                    {CATEGORY_LABELS[p.category]} · {inr(p.pricePerUnit)}/{UNIT_LABELS[p.unit]}
                  </span>
                </span>
                <span className="flex shrink-0 gap-0.5">{editAction(p)}</span>
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
              {editing?.id ? "Edit product" : "Add product"}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Input
                size="md"
                label="Name (English)"
                value={editing?.name ?? ""}
                onChange={(v: string) => setEditing((p) => (p ? { ...p, name: v } : p))}
              />
              <Input
                size="md"
                label="नाव (Marathi)"
                value={editing?.nameMr ?? ""}
                onChange={(v: string) => setEditing((p) => (p ? { ...p, nameMr: v } : p))}
              />
              <Input
                size="md"
                label="Emoji icon"
                placeholder="🥬"
                value={editing?.emoji ?? ""}
                onChange={(v: string) => setEditing((p) => (p ? { ...p, emoji: v } : p))}
              />
              <div>
                <Select
                  size="md"
                  label="Category"
                  items={CATEGORIES.map((c) => ({ id: c, label: CATEGORY_LABELS[c] }))}
                  selectedKey={editing?.category ?? "LOCAL_VEG"}
                  onSelectionChange={(k) =>
                    setEditing((p) => (p ? { ...p, category: String(k) as Category } : p))
                  }
                >
                  {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
                </Select>
              </div>
              <div>
                <Select
                  size="md"
                  label="Unit"
                  items={UNITS.map((u) => ({ id: u, label: UNIT_LABELS[u] }))}
                  selectedKey={editing?.unit ?? "KG"}
                  onSelectionChange={(k) =>
                    setEditing((p) => (p ? { ...p, unit: String(k) as Unit } : p))
                  }
                >
                  {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
                </Select>
              </div>
              <Input
                size="md"
                label="Price per unit (₹)"
                type="number"
                value={editing ? String(editing.pricePerUnit) : "0"}
                onChange={(v: string) =>
                  setEditing((p) => (p ? { ...p, pricePerUnit: Number(v) || 0 } : p))
                }
              />
              <div className="sm:col-span-2">
                <Input
                  size="md"
                  label="Description (optional)"
                  value={editing?.description ?? ""}
                  onChange={(v: string) => setEditing((p) => (p ? { ...p, description: v } : p))}
                />
              </div>
              <div className="sm:col-span-2">
                <Toggle
                  size="sm"
                  label="Visible to vendors"
                  isSelected={editing?.active ?? true}
                  onChange={(v) => setEditing((p) => (p ? { ...p, active: v } : p))}
                />
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
            <h2 className="text-md font-semibold text-primary">Delete “{deleting?.name}”?</h2>
            <p className="mt-1 text-sm text-tertiary">Past orders keep their records.</p>
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
