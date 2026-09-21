"use client";

import {
  Box,
  Button,
  Card,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useMemo, useState } from "react";
import type { Tier } from "@/db/schema";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  TIER_LABELS,
  TIER_RANK,
  formatDateStr,
  inr,
} from "@/lib/format";
import { usePollingRefresh } from "@/lib/polling";

export type AdminOrderRow = {
  id: number;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  tier: Tier;
  windowDate: string;
  placedAt: string;
  vendorName: string;
  total: number;
  itemCount: number;
};

export type MoneyRow = {
  id: number;
  type: "CHARGE" | "PAYMENT" | "ADJUSTMENT";
  amount: number;
  note: string | null;
  orderId: number | null;
  createdAt: string;
  vendorName: string;
};

const TXN_LABEL: Record<MoneyRow["type"], string> = {
  CHARGE: "Billed",
  PAYMENT: "Paid",
  ADJUSTMENT: "Adjusted",
};

const TXN_COLOR: Record<MoneyRow["type"], "warning" | "success" | "info"> = {
  CHARGE: "warning",
  PAYMENT: "success",
  ADJUSTMENT: "info",
};

export default function OrdersClient({
  rows,
  txns,
  windowDate,
  grandTotal,
  truncated,
}: {
  rows: AdminOrderRow[];
  txns: MoneyRow[];
  windowDate: string | null;
  grandTotal: number;
  truncated: boolean;
}) {
  usePollingRefresh(30000);
  const [tab, setTab] = useState<"orders" | "money">("orders");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("recent");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const r = rows.filter(
      (o) =>
        (status === "ALL" || o.status === status) &&
        (q === "" || o.vendorName.toLowerCase().includes(q)),
    );
    r.sort((a, b) => {
      if (sort === "total") return b.total - a.total;
      if (sort === "vendor") return a.vendorName.localeCompare(b.vendorName);
      if (sort === "tier")
        return (
          TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
          b.placedAt.localeCompare(a.placedAt)
        );
      return b.placedAt.localeCompare(a.placedAt);
    });
    return r;
  }, [rows, query, status, sort]);

  const visibleTxns = useMemo(() => {
    const q = query.trim().toLowerCase();
    return txns.filter(
      (t) =>
        q === "" ||
        t.vendorName.toLowerCase().includes(q) ||
        (t.note ?? "").toLowerCase().includes(q),
    );
  }, [txns, query]);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 1,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          History
        </Typography>
        <form>
          <TextField
            name="date"
            type="date"
            label={windowDate ? "Window date (filtered)" : "Filter by date"}
            defaultValue={windowDate ?? ""}
            size="small"
            sx={{ width: 200 }}
          />
          <Button type="submit" variant="contained" sx={{ ml: 1 }}>
            View
          </Button>
          {windowDate && (
            <Button sx={{ ml: 1 }} href="/admin/orders">
              All
            </Button>
          )}
        </form>
      </Box>

      <Typography color="text.secondary" gutterBottom>
        {windowDate ? `${formatDateStr(windowDate)} window · ` : "All windows · "}
        {rows.length} orders · {inr(grandTotal)} total
        {truncated && " · showing latest 200"}
      </Typography>

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab value="orders" label={`Orders (${rows.length})`} />
        <Tab value="money" label={`Money (${txns.length})`} />
      </Tabs>

      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <TextField
          size="small"
          label={tab === "orders" ? "Search retailer" : "Search retailer / note"}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 160 }}
        />
        {tab === "orders" && (
          <>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <MenuItem value="ALL">All</MenuItem>
                {(["CONFIRMED", "DELIVERED", "CANCELLED"] as const).map(
                  (s) => (
                    <MenuItem key={s} value={s}>
                      {ORDER_STATUS_LABELS[s]}
                    </MenuItem>
                  ),
                )}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Sort</InputLabel>
              <Select
                label="Sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                <MenuItem value="recent">Most recent</MenuItem>
                <MenuItem value="tier">Rank (VIP first)</MenuItem>
                <MenuItem value="total">Highest total</MenuItem>
                <MenuItem value="vendor">Retailer A–Z</MenuItem>
              </Select>
            </FormControl>
          </>
        )}
      </Box>

      {tab === "orders" ? (
        visible.length === 0 ? (
          <Card
            variant="outlined"
            sx={{ p: 4, textAlign: "center", borderRadius: 1.5 }}
          >
            <Typography color="text.secondary">No orders match.</Typography>
          </Card>
        ) : (
          visible.map((o) => (
            <Link
              key={o.id}
              href={`/admin/orders/${o.id}`}
              style={{ textDecoration: "none" }}
            >
              <Card
                variant="outlined"
                sx={{ borderRadius: 1.5, mb: 1, p: 2 }}
              >
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Box>
                    <Typography sx={{ fontWeight: 600 }}>
                      {o.vendorName}{" "}
                      <Chip
                        label={TIER_LABELS[o.tier]}
                        color={o.tier === "VIP" ? "warning" : "default"}
                        size="small"
                        sx={{ ml: 0.5, height: 20, fontSize: 11 }}
                      />
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDateStr(o.windowDate)} · {o.itemCount} items ·{" "}
                      {inr(o.total)}
                    </Typography>
                  </Box>
                  <Chip
                    label={ORDER_STATUS_LABELS[o.status]}
                    color={ORDER_STATUS_COLORS[o.status] as never}
                    size="small"
                  />
                </Box>
              </Card>
            </Link>
          ))
        )
      ) : visibleTxns.length === 0 ? (
        <Card
          variant="outlined"
          sx={{ p: 4, textAlign: "center", borderRadius: 1.5 }}
        >
          <Typography color="text.secondary">
            No money movement yet — it appears here after billing and payments.
          </Typography>
        </Card>
      ) : (
        visibleTxns.map((t) => (
          <Card
            key={t.id}
            variant="outlined"
            sx={{ borderRadius: 1.5, mb: 1, p: 2 }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 1,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600 }} noWrap>
                  {t.vendorName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(t.createdAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {t.note ? ` · ${t.note}` : ""}
                  {t.orderId ? ` · order #${t.orderId}` : ""}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: t.amount >= 0 ? "warning.main" : "success.main",
                  }}
                >
                  {t.amount >= 0 ? "+" : "−"}
                  {inr(Math.abs(t.amount))}
                </Typography>
                <Chip
                  label={TXN_LABEL[t.type]}
                  color={TXN_COLOR[t.type]}
                  size="small"
                />
              </Box>
            </Box>
          </Card>
        ))
      )}
    </Box>
  );
}
