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
  TextField,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  formatDateStr,
  inr,
} from "@/lib/format";
import { usePollingRefresh } from "@/lib/polling";

export type AdminOrderRow = {
  id: number;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  placedAt: string;
  vendorName: string;
  total: number;
  itemCount: number;
};

export default function OrdersClient({
  rows,
  windowDate,
  grandTotal,
}: {
  rows: AdminOrderRow[];
  windowDate: string;
  grandTotal: number;
}) {
  usePollingRefresh(15000);
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
      return b.placedAt.localeCompare(a.placedAt);
    });
    return r;
  }, [rows, query, status, sort]);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Orders
        </Typography>
        <form>
          <TextField
            name="date"
            type="date"
            label="Window date"
            defaultValue={windowDate}
            size="small"
            sx={{ width: 200 }}
          />
          <Button type="submit" variant="contained" sx={{ ml: 1 }}>
            View
          </Button>
        </form>
      </Box>

      <Typography color="text.secondary" gutterBottom>
        {formatDateStr(windowDate)} window · {rows.length} orders ·{" "}
        {inr(grandTotal)} total
      </Typography>

      <Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
        <TextField
          size="small"
          label="Search retailer"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flexGrow: 1, minWidth: 160 }}
        />
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Status</InputLabel>
          <Select
            label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
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
        <FormControl size="small" sx={{ minWidth: 130 }}>
          <InputLabel>Sort</InputLabel>
          <Select
            label="Sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            <MenuItem value="recent">Most recent</MenuItem>
            <MenuItem value="total">Highest total</MenuItem>
            <MenuItem value="vendor">Retailer A–Z</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {visible.length === 0 ? (
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
                    {o.vendorName}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {o.itemCount} items · {inr(o.total)}
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
      )}
    </Box>
  );
}
