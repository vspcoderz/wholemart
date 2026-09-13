"use client";

import {
  Box,
  Button,
  Card,
  IconButton,
  Paper,
  Snackbar,
  Alert,
  Typography,
  Divider,
} from "@mui/material";
import { Add, Remove } from "@mui/icons-material";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Unit } from "@/db/schema";
import { UNIT_LABELS, UNIT_STEPS, inr } from "@/lib/format";
import { useCart } from "@/components/cart/CartProvider";
import { useLang } from "@/lib/i18n";
import { saveOrder } from "@/lib/actions/orders";

type CartProduct = { id: number; name: string; nameMr: string | null; emoji: string | null; unit: Unit; price: number };

export default function CartClient({
  catalog,
  windowOpen,
}: {
  catalog: CartProduct[];
  windowOpen: boolean;
}) {
  const router = useRouter();
  const { items, setQty, clear } = useCart();
  const { t, lang } = useLang();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  const rows = [
    ...new Map(
      items
        .map((i) => {
          const p = catalog.find((c) => c.id === i.productId);
          return p ? { ...p, quantity: i.quantity, total: i.quantity * p.price } : null;
        })
        .filter((r): r is CartProduct & { quantity: number; total: number } => r !== null)
        .map((r) => [r.id, r]),
    ).values(),
  ];

  const grandTotal = rows.reduce((s, r) => s + r.total, 0);

  function submit() {
    startTransition(async () => {
      const res = await saveOrder(items.filter((i) => i.quantity > 0));
      if (res.ok) {
        setToast({ msg: t("orderSaved"), severity: "success" });
        router.push("/vendor/orders");
      } else {
        setToast({ msg: res.error, severity: "error" });
      }
    });
  }

  if (rows.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 1.5, mt: 2 }}>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          {t("emptyCart")}
        </Typography>
        <Button variant="contained" onClick={() => router.push("/vendor")}>
          {t("browse")}
        </Button>
      </Paper>
    );
  }

  return (
    <Box sx={{ pb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {t("cart")}
      </Typography>

      {rows.map((r) => (
        <Card
          key={r.id}
          variant="outlined"
          sx={{ mb: 1, borderRadius: 1.5, p: 1.25, display: "flex", alignItems: "center", gap: 1.5 }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 1,
              display: "grid",
              placeItems: "center",
              bgcolor: "action.hover",
              fontSize: 24,
              flexShrink: 0,
            }}
          >
            {r.emoji ?? "🥬"}
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography sx={{ fontWeight: 600 }} noWrap>
              {lang === "mr" && r.nameMr ? r.nameMr : r.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {inr(r.price)} / {UNIT_LABELS[r.unit]} · {inr(r.total)}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <IconButton
              size="small"
              aria-label={`Reduce ${r.name}`}
              disabled={!windowOpen}
              onClick={() =>
                setQty(r.id, Math.max(0, r.quantity - (UNIT_STEPS[r.unit] ?? 1)))
              }
              sx={{ border: 1, borderColor: "divider", minHeight: 36, minWidth: 36 }}
            >
              <Remove fontSize="small" />
            </IconButton>
            <Typography sx={{ minWidth: 34, textAlign: "center", fontWeight: 700 }}>
              {r.quantity}
            </Typography>
            <IconButton
              size="small"
              aria-label={`Add more ${r.name}`}
              disabled={!windowOpen}
              onClick={() => setQty(r.id, r.quantity + (UNIT_STEPS[r.unit] ?? 1))}
              sx={{
                border: 1,
                borderColor: "primary.main",
                minHeight: 36,
                minWidth: 36,
                bgcolor: "primary.main",
                color: "primary.contrastText",
              }}
            >
              <Add fontSize="small" />
            </IconButton>
          </Box>
        </Card>
      ))}

      <Divider sx={{ my: 2 }} />

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, px: 0.5 }}>
        <Typography variant="h6">
          {t("total")} ({t("payOnDelivery")})
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          {inr(grandTotal)}
        </Typography>
      </Box>

      {windowOpen ? (
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={pending}
            onClick={submit}
          >
            {pending ? t("saving") : t("saveOrder")}
          </Button>
          <Button
            color="error"
            size="large"
            onClick={() => {
              clear();
              router.refresh();
            }}
          >
            {t("clear")}
          </Button>
        </Box>
      ) : (
        <Alert severity="warning">{t("windowClosed")}</Alert>
      )}

      <Snackbar open={toast !== null} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? "success"} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
