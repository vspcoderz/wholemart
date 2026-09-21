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
  IconButton,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { Add, ExpandLess, ExpandMore, Remove } from "@mui/icons-material";
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

type ModalState = { retailer: RetailerBalance; mode: "add" | "remove" };

function MoneyModal({
  state,
  onClose,
  notify,
}: {
  state: ModalState | null;
  onClose: () => void;
  notify: (msg: string, severity: "success" | "error") => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");

  const value = Number(amount);
  const valid = Number.isFinite(value) && value > 0;
  const after =
    state == null || !valid
      ? null
      : state.mode === "add"
        ? state.retailer.balance + value
        : state.retailer.balance - value;

  function close() {
    setAmount("");
    onClose();
  }

  function confirm() {
    if (state == null || !valid) return;
    startTransition(async () => {
      const res =
        state.mode === "add"
          ? await recordAdjustment(state.retailer.id, value, "Extra charge")
          : await recordPayment(state.retailer.id, value, "");
      if (res.ok) {
        notify(
          state.mode === "add"
            ? `Added ${inr(value)} to dues.`
            : `Removed ${inr(value)} from dues.`,
          "success",
        );
        close();
        router.refresh();
      } else {
        notify(res.error, "error");
      }
    });
  }

  return (
    <Dialog open={state !== null} onClose={close} fullWidth maxWidth="xs">
      <DialogTitle>
        {state?.mode === "add" ? "Add to dues" : "Remove from dues"}
        {state ? ` — ${state.retailer.businessName}` : ""}
      </DialogTitle>
      <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
        {state && (
          <Typography variant="body2" color="text.secondary">
            Owes now: {inr(state.retailer.balance)}
            {after !== null && (
              <>
                {" → "}
                <strong>{inr(after)}</strong>
              </>
            )}
          </Typography>
        )}
        <TextField
          label="Amount ₹"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ""))}
          autoFocus
          slotProps={{ htmlInput: { inputMode: "decimal" } }}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirm();
          }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={close}>Cancel</Button>
        <Button
          variant="contained"
          color={state?.mode === "add" ? "warning" : "success"}
          onClick={confirm}
          disabled={pending || !valid}
        >
          {pending
            ? "Saving…"
            : state?.mode === "add"
              ? `Add ${valid ? inr(value) : ""}`
              : `Remove ${valid ? inr(value) : ""}`}
        </Button>
      </DialogActions>
    </Dialog>
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
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modal, setModal] = useState<ModalState | null>(null);
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
            <strong>Remove</strong> = money received, dues go down.{" "}
            <strong>Add</strong> = extra charge, dues go up.
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
          sx={{ borderRadius: 1.5, mb: 1 }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              p: 2,
              flexWrap: "wrap",
            }}
          >
            <Box
              onClick={() => setExpanded((v) => (v === r.id ? null : r.id))}
              sx={{
                flexGrow: 1,
                minWidth: 0,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 0.5,
              }}
            >
              <Box sx={{ minWidth: 0 }}>
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
              <IconButton size="small">
                {expanded === r.id ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            <Box sx={{ display: "flex", gap: 1, flexShrink: 0 }}>
              <Button
                size="small"
                variant="contained"
                color="success"
                startIcon={<Remove />}
                onClick={() => setModal({ retailer: r, mode: "remove" })}
                disabled={r.balance <= 0}
              >
                Remove
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<Add />}
                onClick={() => setModal({ retailer: r, mode: "add" })}
              >
                Add
              </Button>
            </Box>
          </Box>

          {expanded === r.id && (
            <Box sx={{ px: 2, pb: 2 }}>
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
              {(byVendor.get(r.id) ?? []).length === 0 && (
                <Typography variant="caption" color="text.secondary">
                  No entries yet.
                </Typography>
              )}
            </Box>
          )}
        </Card>
      ))}

      <MoneyModal
        state={modal}
        onClose={() => setModal(null)}
        notify={notify}
      />

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
