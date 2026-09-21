"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  IconButton,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { ExpandMore, ExpandLess } from "@mui/icons-material";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Tier } from "@/db/schema";
import { TIER_LABELS, inr } from "@/lib/format";
import { recordAdjustment, recordPayment } from "@/lib/actions/accounting";

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

function RetailerCard({
  r,
  recent,
  notify,
}: {
  r: RetailerBalance;
  recent: LedgerRow[];
  notify: (msg: string, severity: "success" | "error") => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [payAmt, setPayAmt] = useState(() =>
    r.balance > 0 ? String(Math.round(r.balance)) : "",
  );
  const [payNote, setPayNote] = useState("");
  const [adjAmt, setAdjAmt] = useState("");
  const [adjNote, setAdjNote] = useState("");

  function savePayment() {
    const value = Number(payAmt);
    if (!Number.isFinite(value) || value <= 0) {
      notify("Enter an amount more than 0.", "error");
      return;
    }
    startTransition(async () => {
      const res = await recordPayment(r.id, value, payNote);
      if (res.ok) {
        notify(`Payment of ${inr(value)} recorded.`, "success");
        setPayAmt("");
        setPayNote("");
        router.refresh();
      } else {
        notify(res.error, "error");
      }
    });
  }

  function saveAdjustment() {
    const value = Number(adjAmt);
    if (!Number.isFinite(value) || value === 0) {
      notify("Enter a non-zero amount (negative reduces dues).", "error");
      return;
    }
    if (!adjNote.trim()) {
      notify("Give a reason for the adjustment.", "error");
      return;
    }
    startTransition(async () => {
      const res = await recordAdjustment(r.id, value, adjNote);
      if (res.ok) {
        notify("Adjustment recorded.", "success");
        setAdjAmt("");
        setAdjNote("");
        router.refresh();
      } else {
        notify(res.error, "error");
      }
    });
  }

  return (
    <Card variant="outlined" sx={{ borderRadius: 1.5, mb: 1 }}>
      <Box
        onClick={() => setOpen((v) => !v)}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          p: 2,
          cursor: "pointer",
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 600 }} noWrap>
            {r.businessName}{" "}
            <Chip
              label={TIER_LABELS[r.tier]}
              color={r.tier === "VIP" ? "warning" : "default"}
              size="small"
              sx={{ ml: 0.5, height: 20, fontSize: 11 }}
            />
            {!r.active && (
              <Chip label="Inactive" size="small" sx={{ ml: 0.5 }} />
            )}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Owes {inr(r.balance)}
            {r.phone ? ` · ${r.phone}` : ""}
          </Typography>
        </Box>
        <IconButton size="small" aria-label={open ? "Collapse" : "Expand"}>
          {open ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {open && (
        <Box sx={{ px: 2, pb: 2 }}>
          {recent.map((t) => (
            <Typography
              key={t.id}
              variant="caption"
              color="text.secondary"
              sx={{ display: "block" }}
            >
              {TXN_LABEL[t.type]} {t.amount >= 0 ? "+" : "−"}
              {inr(Math.abs(t.amount))}
              {t.note ? ` — ${t.note}` : ""}
            </Typography>
          ))}

          <Box
            sx={{
              display: "flex",
              gap: 1,
              mt: 1.5,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <TextField
              size="small"
              label="Payment ₹"
              value={payAmt}
              onChange={(e) =>
                setPayAmt(e.target.value.replace(/[^0-9.]/g, ""))
              }
              slotProps={{ htmlInput: { inputMode: "decimal", style: { width: 90 } } }}
            />
            <TextField
              size="small"
              label="Note (cash / UPI…)"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 140 }}
            />
            <Button
              size="small"
              variant="contained"
              onClick={savePayment}
              disabled={pending || r.balance <= 0}
            >
              Got payment
            </Button>
          </Box>

          <Box
            sx={{
              display: "flex",
              gap: 1,
              mt: 1,
              flexWrap: "wrap",
              alignItems: "center",
            }}
          >
            <TextField
              size="small"
              label="Adjust ₹ (±)"
              value={adjAmt}
              onChange={(e) =>
                setAdjAmt(e.target.value.replace(/[^0-9.\-]/g, ""))
              }
              slotProps={{ htmlInput: { inputMode: "decimal", style: { width: 90 } } }}
            />
            <TextField
              size="small"
              label="Reason (required)"
              value={adjNote}
              onChange={(e) => setAdjNote(e.target.value)}
              sx={{ flexGrow: 1, minWidth: 140 }}
            />
            <Button size="small" onClick={saveAdjustment} disabled={pending}>
              Adjust
            </Button>
          </Box>
        </Box>
      )}
    </Card>
  );
}

export default function AccountingClient({
  outstanding,
  retailers,
  recent,
}: {
  outstanding: number;
  retailers: RetailerBalance[];
  recent: LedgerRow[];
}) {
  const [query, setQuery] = useState("");
  const [toast, setToast] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  function notify(msg: string, severity: "success" | "error") {
    setToast({ msg, severity });
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = retailers.filter(
      (r) => q === "" || r.businessName.toLowerCase().includes(q),
    );
    rows.sort((a, b) => b.balance - a.balance);
    return rows;
  }, [retailers, query]);

  const byVendor = useMemo(() => {
    const m = new Map<number, LedgerRow[]>();
    for (const t of recent) {
      const list = m.get(t.vendorId) ?? [];
      if (list.length < 3) list.push(t);
      m.set(t.vendorId, list);
    }
    return m;
  }, [recent]);

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Accounting
      </Typography>

      <Card variant="outlined" sx={{ borderRadius: 1.5, mb: 2 }}>
        <CardContent
          sx={{ display: "flex", gap: 3, flexWrap: "wrap", alignItems: "center" }}
        >
          <Box>
            <Typography variant="caption" color="text.secondary">
              Total outstanding
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              {inr(outstanding)}
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ flexGrow: 1 }}>
            Balances grow when billing is finalized and shrink when you record
            a payment. Tap a retailer to record money or adjust.
          </Typography>
          <TextField
            size="small"
            label="Search retailer"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            sx={{ minWidth: 180 }}
          />
        </CardContent>
      </Card>

      {visible.map((r) => (
        <RetailerCard
          key={r.id}
          r={r}
          recent={byVendor.get(r.id) ?? []}
          notify={notify}
        />
      ))}

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
      >
        <Alert
          severity={toast?.severity ?? "success"}
          onClose={() => setToast(null)}
        >
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
