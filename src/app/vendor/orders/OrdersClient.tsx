"use client";

import {
  Box,
  Button,
  Chip,
  Paper,
  Snackbar,
  Alert,
  Typography,
} from "@mui/material";
import { Replay, Download, Note } from "@mui/icons-material";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  formatDateStr,
  inr,
} from "@/lib/format";
import { repeatOrder } from "@/lib/actions/orders";
import { useCart } from "@/components/cart/CartProvider";
import { useLang } from "@/lib/i18n";

type OrderRow = {
  id: number;
  windowDate: string;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  adminNote: string | null;
  itemCount: number;
  total: number;
  currentWindow: boolean;
};

export default function OrdersClient({
  orders,
  currentWindowOpen,
}: {
  orders: OrderRow[];
  currentWindowOpen: boolean;
}) {
  const router = useRouter();
  const { replaceAll } = useCart();
  const { t } = useLang();
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  function repeat(o: OrderRow) {
    startTransition(async () => {
      const res = await repeatOrder(o.id);
      if (res.ok) {
        replaceAll(res.items);
        router.push("/vendor/cart");
      } else {
        setToast({ msg: res.error ?? "Could not repeat order.", severity: "error" });
      }
    });
  }

  if (orders.length === 0) {
    return (
      <Paper variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 1.5, mt: 2 }}>
        <Typography color="text.secondary">{t("noOrders")}</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ pb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {t("myOrders")}
      </Typography>

      {orders.map((o) => (
        <Paper key={o.id} variant="outlined" sx={{ mb: 1, p: 1.5, borderRadius: 1.5 }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
            <Box sx={{ minWidth: 0 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography sx={{ fontWeight: 700 }}>
                  {formatDateStr(o.windowDate)} {t("windowLabel")}
                </Typography>
                {o.currentWindow && (
                  <Chip size="small" color="primary" label={t("current")} />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary">
                {o.itemCount} {t("items")} · {t("payOnDelivery")}
                {(o.status === "CONFIRMED" || o.status === "DELIVERED") &&
                  ` · ${inr(o.total)}`}
              </Typography>
            </Box>
            <Chip
              label={ORDER_STATUS_LABELS[o.status]}
              color={ORDER_STATUS_COLORS[o.status] as never}
              size="small"
            />
          </Box>

          {o.adminNote && (
            <Typography variant="body2" sx={{ mt: 1, display: "flex", gap: 0.5, alignItems: "flex-start" }}>
              <Note fontSize="small" sx={{ mt: "2px" }} />
              <span>
                <strong>{t("noteFromSupplier")}</strong> {o.adminNote}
              </span>
            </Typography>
          )}

          <Box sx={{ display: "flex", gap: 1, mt: 1.5 }}>
            <Button
              size="small"
              startIcon={<Download />}
              href={`/api/invoice/${o.id}`}
              target="_blank"
            >
              {t("invoicePdf")}
            </Button>
            {currentWindowOpen && o.status === "PLACED" && (
              <Button
                size="small"
                startIcon={<Replay />}
                disabled={pending}
                onClick={() => repeat(o)}
              >
                {pending ? "…" : t("repeatInCart")}
              </Button>
            )}
          </Box>
        </Paper>
      ))}

      <Snackbar open={toast !== null} autoHideDuration={4000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? "success"} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
