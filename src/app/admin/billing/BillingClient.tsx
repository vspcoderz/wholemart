"use client";

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  FormControl,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import {
  ExpandMore,
  Download,
  SelectAll,
  Deselect,
} from "@mui/icons-material";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Category, Unit } from "@/db/schema";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  UNITS,
  UNIT_LABELS,
  inr,
} from "@/lib/format";
import { usePollingRefresh } from "@/lib/polling";
import { finalizeBilling } from "@/lib/actions/billing";

export type BillingItem = {
  id: number;
  productId: number | null;
  productName: string;
  category: Category | null;
  unit: Unit;
  unitPrice: number;
  quantity: number;
  confirmedQuantity: number | null;
};

export type BillingOrder = {
  id: number;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  vendorName: string;
  items: BillingItem[];
};

type LineEdit = { price: string; qty: string; unit: Unit };

const num = (s: string, fallback: number) => {
  const v = Number(s);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};

/** Auto-convert qty when switching between weight units; relabel otherwise. */
function convertQty(qty: number, from: Unit, to: Unit): number {
  if (from === to) return qty;
  if (from === "KG" && to === "G") return qty * 1000;
  if (from === "G" && to === "KG") return qty / 1000;
  return qty;
}

type SortKey = "name" | "qty" | "amount";
type SortDir = "asc" | "desc";

export default function BillingClient({
  windowDate,
  orders,
}: {
  windowDate: string;
  orders: BillingOrder[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  usePollingRefresh(15000);

  // Preselect unbilled (PLACED) orders — the daily workflow.
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(orders.filter((o) => o.status === "PLACED").map((o) => o.id)),
  );
  const [edits, setEdits] = useState<Record<number, LineEdit>>(() =>
    Object.fromEntries(
      orders.flatMap((o) =>
        o.items.map((i) => [
          i.id,
          {
            price: String(i.unitPrice),
            qty: String(i.confirmedQuantity ?? i.quantity),
            unit: i.unit,
          },
        ]),
      ),
    ),
  );

  const [vendorQuery, setVendorQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [orderSort, setOrderSort] = useState<"vendor" | "total">("vendor");
  const [productQuery, setProductQuery] = useState("");
  const [catFilter, setCatFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [toast, setToast] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  const editOf = (i: BillingItem): LineEdit =>
    edits[i.id] ?? {
      price: String(i.unitPrice),
      qty: String(i.confirmedQuantity ?? i.quantity),
      unit: i.unit,
    };
  const lineValue = (i: BillingItem) => {
    const e = editOf(i);
    return num(e.qty, 0) * num(e.price, 0);
  };
  const orderValue = (o: BillingOrder) =>
    o.items.reduce((s, i) => s + lineValue(i), 0);

  const visibleOrders = useMemo(() => {
    const q = vendorQuery.trim().toLowerCase();
    const rows = orders.filter(
      (o) =>
        (statusFilter === "ALL" || o.status === statusFilter) &&
        (q === "" || o.vendorName.toLowerCase().includes(q)),
    );
    rows.sort((a, b) =>
      orderSort === "vendor"
        ? a.vendorName.localeCompare(b.vendorName)
        : orderValue(b) - orderValue(a),
    );
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, vendorQuery, statusFilter, orderSort, edits]);

  const selectedOrders = useMemo(
    () => orders.filter((o) => selected.has(o.id)),
    [orders, selected],
  );

  // Product aggregation across the selection (rate editable per product).
  const summary = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    const map = new Map<
      string,
      {
        name: string;
        category: Category | null;
        unit: Unit;
        qty: number;
        prices: Set<number>;
      }
    >();
    for (const o of selectedOrders) {
      if (o.status === "CANCELLED") continue;
      for (const i of o.items) {
        const e = editOf(i);
        const key = `${i.productName}|||${e.unit}`;
        const row = map.get(key) ?? {
          name: i.productName,
          category: i.category,
          unit: e.unit,
          qty: 0,
          prices: new Set<number>(),
        };
        row.qty += num(e.qty, 0);
        row.prices.add(num(e.price, 0));
        map.set(key, row);
      }
    }
    let rows = [...map.entries()].map(([key, r]) => ({
      key,
      ...r,
      rate: r.prices.size === 1 ? [...r.prices][0] : null, // null = mixed
    }));
    rows = rows.filter(
      (r) =>
        (catFilter === "ALL" ||
          (catFilter === "__NONE__"
            ? r.category === null
            : r.category === catFilter)) &&
        (q === "" || r.name.toLowerCase().includes(q)),
    );
    const dir = sortDir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name) * dir;
      if (sortKey === "qty") return (a.qty - b.qty) * dir;
      return (a.qty * (a.rate ?? 0) - b.qty * (b.rate ?? 0)) * dir;
    });
    return rows;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedOrders, productQuery, catFilter, sortKey, sortDir, edits]);

  const grandTotal = selectedOrders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((s, o) => s + orderValue(o), 0);

  function setLine(itemId: number, patch: Partial<LineEdit>) {
    setEdits((p) => ({ ...p, [itemId]: { ...editOfById(itemId), ...patch } }));
  }
  function editOfById(itemId: number): LineEdit {
    return (
      edits[itemId] ?? { price: "0", qty: "0", unit: "KG" as Unit }
    );
  }

  function setProductRate(key: string, rate: string) {
    const v = Number(rate.replace(/[^0-9.]/g, ""));
    if (!Number.isFinite(v) || v < 0) return;
    setEdits((p) => {
      const next = { ...p };
      for (const o of selectedOrders) {
        for (const i of o.items) {
          const e = next[i.id] ?? {
            price: String(i.unitPrice),
            qty: String(i.confirmedQuantity ?? i.quantity),
            unit: i.unit,
          };
          if (`${i.productName}|||${e.unit}` === key) {
            next[i.id] = { ...e, price: String(v) };
          }
        }
      }
      return next;
    });
  }

  function toggle(id: number) {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function finalize() {
    const billable = selectedOrders.filter((o) => o.status !== "CANCELLED");
    if (billable.length === 0) {
      setToast({ msg: "Select at least one billable order.", severity: "error" });
      return;
    }
    if (
      !confirm(
        `Finalize billing for ${billable.length} order(s), total ${inr(grandTotal)}? Rates, quantities and units will be written to the orders.`,
      )
    )
      return;
    const lines = billable.flatMap((o) =>
      o.items.map((i) => {
        const e = editOf(i);
        return {
          itemId: i.id,
          orderId: o.id,
          unitPrice: num(e.price, i.unitPrice),
          quantity: num(e.qty, i.confirmedQuantity ?? i.quantity),
          unit: e.unit,
        };
      }),
    );
    startTransition(async () => {
      const res = await finalizeBilling(
        windowDate,
        billable.map((o) => o.id),
        lines,
      );
      if (res.ok) {
        setToast({
          msg: `Billing finalized for ${res.billed} order(s).`,
          severity: "success",
        });
        router.refresh();
      } else {
        setToast({ msg: res.error, severity: "error" });
      }
    });
  }

  return (
    <Grid container spacing={2} sx={{ alignItems: "flex-start" }}>
      {/* ---------- Order selection ---------- */}
      <Grid size={{ xs: 12, md: 5 }}>
        <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
          <CardContent>
            <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
              <TextField
                size="small"
                label="Search retailer"
                value={vendorQuery}
                onChange={(e) => setVendorQuery(e.target.value)}
                sx={{ flexGrow: 1, minWidth: 140 }}
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  label="Status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All</MenuItem>
                  {(["PLACED", "CONFIRMED", "DELIVERED", "CANCELLED"] as const).map(
                    (s) => (
                      <MenuItem key={s} value={s}>
                        {ORDER_STATUS_LABELS[s]}
                      </MenuItem>
                    ),
                  )}
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel>Sort</InputLabel>
                <Select
                  label="Sort"
                  value={orderSort}
                  onChange={(e) =>
                    setOrderSort(e.target.value as "vendor" | "total")
                  }
                >
                  <MenuItem value="vendor">Name</MenuItem>
                  <MenuItem value="total">Total</MenuItem>
                </Select>
              </FormControl>
            </Box>
            <Box sx={{ display: "flex", gap: 1, mb: 1 }}>
              <Button
                size="small"
                startIcon={<SelectAll />}
                onClick={() =>
                  setSelected(new Set(visibleOrders.map((o) => o.id)))
                }
              >
                All
              </Button>
              <Button
                size="small"
                startIcon={<Deselect />}
                onClick={() => setSelected(new Set())}
              >
                None
              </Button>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ ml: "auto", alignSelf: "center" }}
              >
                {selected.size} selected
              </Typography>
            </Box>
            {visibleOrders.length === 0 ? (
              <Typography color="text.secondary">
                No orders match.
              </Typography>
            ) : (
              visibleOrders.map((o) => (
                <Box
                  key={o.id}
                  onClick={() => toggle(o.id)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    p: 1,
                    borderRadius: 1.5,
                    border: 1,
                    borderColor: selected.has(o.id)
                      ? "primary.main"
                      : "divider",
                    bgcolor: selected.has(o.id)
                      ? "action.selected"
                      : "transparent",
                    mb: 1,
                    cursor: "pointer",
                  }}
                >
                  <Checkbox
                    checked={selected.has(o.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggle(o.id)}
                    size="small"
                  />
                  <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                    <Typography sx={{ fontWeight: 600 }} noWrap>
                      {o.vendorName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {o.items.length} items · {inr(orderValue(o))}
                    </Typography>
                  </Box>
                  <Chip
                    label={ORDER_STATUS_LABELS[o.status]}
                    color={ORDER_STATUS_COLORS[o.status] as never}
                    size="small"
                  />
                </Box>
              ))
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* ---------- Product totals + line editors ---------- */}
      <Grid size={{ xs: 12, md: 7 }}>
        <Card variant="outlined" sx={{ borderRadius: 1.5, mb: 2 }}>
          <CardContent>
            <Typography gutterBottom sx={{ fontWeight: 700 }}>
              Products across selection ({summary.length})
            </Typography>
            <Box sx={{ display: "flex", gap: 1, mb: 1.5, flexWrap: "wrap" }}>
              <TextField
                size="small"
                label="Search product"
                value={productQuery}
                onChange={(e) => setProductQuery(e.target.value)}
                sx={{ flexGrow: 1, minWidth: 140 }}
              />
              <FormControl size="small" sx={{ minWidth: 130 }}>
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={catFilter}
                  onChange={(e) => setCatFilter(e.target.value)}
                >
                  <MenuItem value="ALL">All</MenuItem>
                  {CATEGORIES.map((c) => (
                    <MenuItem key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </MenuItem>
                  ))}
                  <MenuItem value="__NONE__">Other</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 110 }}>
                <InputLabel>Sort</InputLabel>
                <Select
                  label="Sort"
                  value={`${sortKey}:${sortDir}`}
                  onChange={(e) => {
                    const [k, d] = e.target.value.split(":");
                    setSortKey(k as SortKey);
                    setSortDir(d as SortDir);
                  }}
                >
                  <MenuItem value="name:asc">Name ↑</MenuItem>
                  <MenuItem value="name:desc">Name ↓</MenuItem>
                  <MenuItem value="qty:desc">Qty ↓</MenuItem>
                  <MenuItem value="qty:asc">Qty ↑</MenuItem>
                  <MenuItem value="amount:desc">Amount ↓</MenuItem>
                  <MenuItem value="amount:asc">Amount ↑</MenuItem>
                </Select>
              </FormControl>
            </Box>
            {summary.length === 0 ? (
              <Typography color="text.secondary">
                Select orders to see product totals.
              </Typography>
            ) : (
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Product</TableCell>
                      <TableCell align="right">Qty</TableCell>
                      <TableCell align="right" sx={{ width: 130 }}>
                        Rate
                      </TableCell>
                      <TableCell align="right">Amount</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {summary.map((r) => (
                      <TableRow key={r.key}>
                        <TableCell>
                          {r.name}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: "block" }}
                          >
                            {r.category
                              ? CATEGORY_LABELS[r.category]
                              : "Other"}{" "}
                            · per {UNIT_LABELS[r.unit]}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {r.qty} {UNIT_LABELS[r.unit]}
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            value={r.rate === null ? "" : String(r.rate)}
                            placeholder={r.rate === null ? "mixed" : undefined}
                            onChange={(e) =>
                              setProductRate(
                                r.key,
                                e.target.value.replace(/[^0-9.]/g, ""),
                              )
                            }
                            slotProps={{
                              htmlInput: {
                                sx: { textAlign: "right", width: 70 },
                              },
                              input: {
                                startAdornment: (
                                  <InputAdornment position="start">
                                    ₹
                                  </InputAdornment>
                                ),
                              },
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {inr(r.qty * (r.rate ?? 0))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
              <Typography sx={{ fontWeight: 700 }}>
                Selection total: {inr(grandTotal)}
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {selectedOrders.map((o) => (
          <Accordion
            key={o.id}
            variant="outlined"
            sx={{ borderRadius: 1.5, mb: 1 }}
            defaultExpanded={selectedOrders.length <= 3}
          >
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  width: "100%",
                }}
              >
                <Typography sx={{ fontWeight: 600, flexGrow: 1 }}>
                  {o.vendorName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {inr(orderValue(o))}
                </Typography>
                <Chip
                  label={ORDER_STATUS_LABELS[o.status]}
                  color={ORDER_STATUS_COLORS[o.status] as never}
                  size="small"
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              {o.items.map((i) => {
                const e = editOf(i);
                return (
                  <Box
                    key={i.id}
                    sx={{
                      display: "flex",
                      gap: 1,
                      alignItems: "center",
                      flexWrap: "wrap",
                      py: 0.75,
                      borderBottom: 1,
                      borderColor: "divider",
                    }}
                  >
                    <Box sx={{ flexGrow: 1, minWidth: 120 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {i.productName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        ordered {i.quantity} {UNIT_LABELS[i.unit]}
                      </Typography>
                    </Box>
                    <TextField
                      size="small"
                      label="Qty"
                      value={e.qty}
                      onChange={(ev) =>
                        setLine(i.id, {
                          qty: ev.target.value.replace(/[^0-9.]/g, ""),
                        })
                      }
                      slotProps={{
                        htmlInput: { sx: { width: 64, textAlign: "right" } },
                      }}
                    />
                    <FormControl size="small" sx={{ minWidth: 96 }}>
                      <InputLabel>Unit</InputLabel>
                      <Select
                        label="Unit"
                        value={e.unit}
                        onChange={(ev) => {
                          const to = ev.target.value as Unit;
                          const from = editOf(i).unit;
                          setLine(i.id, {
                            unit: to,
                            qty: String(
                              convertQty(num(editOf(i).qty, 0), from, to),
                            ),
                          });
                        }}
                      >
                        {UNITS.map((u) => (
                          <MenuItem key={u} value={u}>
                            {UNIT_LABELS[u]}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                    <TextField
                      size="small"
                      label="Rate"
                      value={e.price}
                      onChange={(ev) =>
                        setLine(i.id, {
                          price: ev.target.value.replace(/[^0-9.]/g, ""),
                        })
                      }
                      slotProps={{
                        htmlInput: { sx: { width: 64, textAlign: "right" } },
                        input: {
                          startAdornment: (
                            <InputAdornment position="start">₹</InputAdornment>
                          ),
                        },
                      }}
                    />
                    <Typography
                      variant="body2"
                      sx={{ fontWeight: 700, minWidth: 70, textAlign: "right" }}
                    >
                      {inr(lineValue(i))}
                    </Typography>
                  </Box>
                );
              })}
              <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
                <Button
                  size="small"
                  startIcon={<Download />}
                  href={`/api/invoice/${o.id}`}
                  target="_blank"
                >
                  Invoice PDF
                </Button>
              </Box>
            </AccordionDetails>
          </Accordion>
        ))}

        <Card variant="outlined" sx={{ borderRadius: 1.5, mt: 2 }}>
          <CardContent
            sx={{ display: "flex", gap: 1, alignItems: "center", flexWrap: "wrap" }}
          >
            <Typography sx={{ fontWeight: 700, flexGrow: 1 }}>
              {selectedOrders.length} order(s) · {inr(grandTotal)}
            </Typography>
            <Button
              variant="contained"
              onClick={finalize}
              disabled={pending || selectedOrders.length === 0}
            >
              {pending ? "Finalizing…" : "Finalize billing"}
            </Button>
          </CardContent>
        </Card>
      </Grid>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
      >
        <Alert severity={toast?.severity ?? "success"} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Grid>
  );
}
