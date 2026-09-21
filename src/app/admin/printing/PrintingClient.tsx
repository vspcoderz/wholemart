"use client";

import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { PictureAsPdf, SelectAll, Deselect } from "@mui/icons-material";
import { useMemo, useState } from "react";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  formatDateStr,
  inr,
} from "@/lib/format";

export type PrintableOrder = {
  id: number;
  status: "CONFIRMED" | "DELIVERED" | "PLACED" | "CANCELLED";
  windowDate: string;
  vendorName: string;
  total: number;
  itemCount: number;
};

export default function PrintingClient({
  rows,
  windowDate,
  truncated,
}: {
  rows: PrintableOrder[];
  windowDate: string | null;
  truncated: boolean;
}) {
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(rows.map((r) => r.id)),
  );
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("ALL");

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(
      (o) =>
        (status === "ALL" || o.status === status) &&
        (q === "" || o.vendorName.toLowerCase().includes(q)),
    );
  }, [rows, query, status]);

  const selectedTotal = useMemo(
    () =>
      rows
        .filter((o) => selected.has(o.id))
        .reduce((s, o) => s + o.total, 0),
    [rows, selected],
  );

  function toggle(id: number) {
    setSelected((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const bulkHref =
    selected.size === 0
      ? undefined
      : `/api/invoices/bulk?ids=${[...selected].join(",")}`;

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
          Printing
        </Typography>
        <form>
          <TextField
            name="date"
            type="date"
            label={windowDate ? "Billed on (filtered)" : "Filter by date"}
            defaultValue={windowDate ?? ""}
            size="small"
            sx={{ width: 200 }}
          />
          <Button type="submit" variant="contained" sx={{ ml: 1 }}>
            View
          </Button>
          {windowDate && (
            <Button sx={{ ml: 1 }} href="/admin/printing">
              All
            </Button>
          )}
        </form>
      </Box>

      <Typography color="text.secondary" gutterBottom>
        Billed orders{windowDate ? ` for ${formatDateStr(windowDate)}` : ""} ·{" "}
        {rows.length} orders{truncated && " (latest 200)"} · pick any set and
        print one combined PDF — each order starts on its own page.
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
            <MenuItem value="CONFIRMED">Billed</MenuItem>
            <MenuItem value="DELIVERED">Delivered</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 1.5, mb: 2 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            p: 1.5,
            flexWrap: "wrap",
          }}
        >
          <Button
            size="small"
            startIcon={<SelectAll />}
            onClick={() => setSelected(new Set(visible.map((o) => o.id)))}
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
            {selected.size} selected · {inr(selectedTotal)}
          </Typography>
          <Button
            variant="contained"
            size="small"
            startIcon={<PictureAsPdf />}
            disabled={selected.size === 0}
            {...(bulkHref
              ? { href: bulkHref, target: "_blank" as const }
              : {})}
          >
            Print PDF
          </Button>
        </Box>
      </Card>

      {visible.length === 0 ? (
        <Card
          variant="outlined"
          sx={{ p: 4, textAlign: "center", borderRadius: 1.5 }}
        >
          <Typography color="text.secondary">
            No billed orders — finalize them in Billing first.
          </Typography>
        </Card>
      ) : (
        visible.map((o) => (
          <Box
            key={o.id}
            onClick={() => toggle(o.id)}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 1.5,
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
                #{o.id} · {formatDateStr(o.windowDate)} · {o.itemCount} items ·{" "}
                {inr(o.total)}
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
    </Box>
  );
}
