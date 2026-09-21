"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { inr } from "@/lib/format";
import { recordAdjustment, recordPayment } from "@/lib/actions/accounting";

export type RetailerBalance = {
  id: number;
  businessName: string;
  phone: string | null;
  active: boolean;
  balance: number;
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

export default function AccountingClient({
  outstanding,
  retailers,
  recent,
}: {
  outstanding: number;
  retailers: RetailerBalance[];
  recent: LedgerRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [openFor, setOpenFor] = useState<RetailerBalance | null>(null);
  const [mode, setMode] = useState<"PAYMENT" | "ADJUSTMENT">("PAYMENT");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

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

  function openDialog(r: RetailerBalance, m: "PAYMENT" | "ADJUSTMENT") {
    setOpenFor(r);
    setMode(m);
    setAmount(m === "PAYMENT" ? String(Math.max(0, Math.round(r.balance))) : "");
    setNote("");
  }

  function submit() {
    if (!openFor) return;
    const value = Number(amount);
    startTransition(async () => {
      const res =
        mode === "PAYMENT"
          ? await recordPayment(openFor.id, value, note)
          : await recordAdjustment(openFor.id, value, note);
      if (res.ok) {
        setToast({
          msg:
            mode === "PAYMENT"
              ? `Payment of ${inr(value)} recorded.`
              : "Adjustment recorded.",
          severity: "success",
        });
        setOpenFor(null);
        router.refresh();
      } else {
        setToast({ msg: res.error, severity: "error" });
      }
    });
  }

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
            Balances grow automatically when billing is finalized and shrink
            when you record a payment. Adjustments handle opening dues and
            corrections.
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
        <Card
          key={r.id}
          variant="outlined"
          sx={{ borderRadius: 1.5, mb: 1, p: 2 }}
        >
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 1,
              flexWrap: "wrap",
            }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography sx={{ fontWeight: 600 }}>
                {r.businessName}
                {!r.active && (
                  <Chip
                    label="Inactive"
                    size="small"
                    sx={{ ml: 1 }}
                    color="default"
                  />
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Owes {inr(r.balance)}
                {r.phone ? ` · ${r.phone}` : ""}
              </Typography>
              {(byVendor.get(r.id) ?? []).map((t) => (
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
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
              <Button
                size="small"
                variant="contained"
                onClick={() => openDialog(r, "PAYMENT")}
                disabled={r.balance <= 0}
              >
                Got payment
              </Button>
              <Button size="small" onClick={() => openDialog(r, "ADJUSTMENT")}>
                Adjust
              </Button>
            </Box>
          </Box>
        </Card>
      ))}

      <Dialog open={openFor !== null} onClose={() => setOpenFor(null)} fullWidth maxWidth="xs">
        <DialogTitle>
          {mode === "PAYMENT" ? "Record payment" : "Balance adjustment"}
          {openFor ? ` — ${openFor.businessName}` : ""}
        </DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          {openFor && (
            <Typography variant="body2" color="text.secondary">
              Current outstanding: {inr(openFor.balance)}
              {mode === "ADJUSTMENT" &&
                " · use a negative amount to reduce what they owe."}
            </Typography>
          )}
          <TextField
            label={mode === "PAYMENT" ? "Amount received (₹)" : "Amount (₹, signed)"}
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value.replace(/[^0-9.\-]/g, ""))
            }
            autoFocus
            slotProps={{ htmlInput: { inputMode: "decimal" } }}
          />
          <TextField
            label={mode === "PAYMENT" ? "Note (cash / UPI …)" : "Reason (required)"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenFor(null)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

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
