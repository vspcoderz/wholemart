"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Snackbar,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  InputAdornment,
} from "@mui/material";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Unit } from "@/db/schema";
import { UNIT_LABELS, inr } from "@/lib/format";
import { adjustOrderItems, setOrderStatus } from "@/lib/actions/admin";

type EditorItem = {
  id: number;
  name: string;
  unit: Unit;
  quantity: number;
  confirmedQuantity: number | null;
  unitPrice: number;
};

const STATUS_OPTIONS = ["PLACED", "CONFIRMED", "DELIVERED", "CANCELLED"] as const;

export default function OrderEditor({
  orderId,
  status,
  adminNote,
  items,
}: {
  orderId: number;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  adminNote: string;
  items: EditorItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [note, setNote] = useState(adminNote);
  const [edits, setEdits] = useState<Record<number, string>>(() =>
    Object.fromEntries(
      items.map((i) => [i.id, String(i.confirmedQuantity ?? i.quantity)]),
    ),
  );
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  function save() {
    // Compare against the effective current value (confirmed ?? ordered) so
    // reverting an adjusted line back to its ordered qty actually persists.
    const changed = items
      .map((i) => ({ i, v: Number(edits[i.id]) }))
      .filter(
        ({ i, v }) =>
          Number.isFinite(v) &&
          v >= 0 &&
          v !== (i.confirmedQuantity ?? i.quantity),
      )
      .map(({ i, v }) => ({ itemId: i.id, quantity: v }));
    startTransition(async () => {
      const res = await adjustOrderItems(orderId, note, changed);
      if (res.ok) {
        setToast({ msg: "Adjustments saved. The vendor will see them.", severity: "success" });
        router.refresh();
      } else {
        setToast({ msg: "Could not save adjustments.", severity: "error" });
      }
    });
  }

  function setStatus(next: (typeof STATUS_OPTIONS)[number]) {
    startTransition(async () => {
      const res = await setOrderStatus(orderId, next);
      if (res.ok) {
        setToast({ msg: `Order marked ${next.toLowerCase()}.`, severity: "success" });
        router.refresh();
      }
    });
  }

  const newTotal = items.reduce(
    (s, i) => s + Number(edits[i.id] ?? i.quantity) * i.unitPrice,
    0,
  );
  const originalTotal = items.reduce(
    (s, i) => s + (i.confirmedQuantity ?? i.quantity) * i.unitPrice,
    0,
  );

  return (
    <>
      <Card variant="outlined" sx={{ borderRadius: 1.5, mb: 2 }}>
        <CardContent>
          <Typography gutterBottom sx={{ fontWeight: 700 }}>
            Items
          </Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Product</TableCell>
                  <TableCell align="right">Ordered</TableCell>
                  <TableCell align="right" sx={{ width: 130 }}>
                    Supplied
                  </TableCell>
                  <TableCell align="right">Amount</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((i) => {
                  const q = Number(edits[i.id] ?? i.quantity);
                  const changed = q !== i.quantity;
                  return (
                    <TableRow key={i.id}>
                      <TableCell>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {i.name}
                          {changed && (
                            <Chip label="adjusted" size="small" color="warning" />
                          )}
                        </Box>
                        <Typography variant="caption" color="text.secondary">
                          {inr(i.unitPrice)} / {UNIT_LABELS[i.unit]}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {i.quantity} {UNIT_LABELS[i.unit]}
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          value={edits[i.id] ?? ""}
                          onChange={(e) =>
                            setEdits((p) => ({ ...p, [i.id]: e.target.value.replace(/[^0-9.]/g, "") }))
                          }
                          size="small"
                          slotProps={{
                            htmlInput: { sx: { textAlign: "right", width: 80 } },
                            input: {
                              endAdornment: (
                                <InputAdornment position="end" sx={{ "& p": { fontSize: 12 } }}>
                                  {UNIT_LABELS[i.unit]}
                                </InputAdornment>
                              ),
                            },
                          }}
                        />
                      </TableCell>
                      <TableCell align="right">{inr(q * i.unitPrice)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ display: "flex", justifyContent: "flex-end", mt: 1 }}>
            <Typography sx={{ fontWeight: 700 }}>New total: {inr(newTotal)}</Typography>
          </Box>
          {newTotal !== originalTotal && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", textAlign: "right" }}>
            Current billed total: {inr(originalTotal)}
          </Typography>
          )}

          <TextField
            fullWidth
            multiline
            rows={2}
            label="Note to vendor (stock shortfall, substitution, etc.)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            sx={{ mt: 2 }}
          />

          <Box sx={{ display: "flex", gap: 1, mt: 2 }}>
            <Button variant="contained" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save adjustments"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
        <CardContent>
          <Typography gutterBottom sx={{ fontWeight: 700 }}>
            Order status
          </Typography>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {STATUS_OPTIONS.map((s) => (
              <Button
                key={s}
                size="small"
                variant={status === s ? "contained" : "outlined"}
                disabled={pending}
                onClick={() => setStatus(s)}
              >
                {s === "PLACED"
                  ? "Placed"
                  : s === "CONFIRMED"
                    ? "Confirm"
                    : s === "DELIVERED"
                      ? "Delivered (paid)"
                      : "Cancel order"}
              </Button>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Snackbar open={toast !== null} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? "success"} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </>
  );
}
