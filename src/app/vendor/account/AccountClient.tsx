"use client";

import {
  Box,
  Card,
  CardContent,
  Chip,
  Paper,
  Typography,
} from "@mui/material";
import { inr } from "@/lib/format";
import { useLang } from "@/lib/i18n";

type Txn = {
  id: number;
  type: "CHARGE" | "PAYMENT" | "ADJUSTMENT";
  amount: number;
  note: string | null;
  orderId: number | null;
  createdAt: string;
};

export default function AccountClient({
  businessName,
  balance,
  txns,
}: {
  businessName: string;
  balance: number;
  txns: Txn[];
}) {
  const { t } = useLang();

  return (
    <Box sx={{ pb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {businessName}
      </Typography>

      <Card variant="outlined" sx={{ borderRadius: 1.5, mb: 2 }}>
        <CardContent>
          <Typography variant="caption" color="text.secondary">
            {t("balanceOwed")}
          </Typography>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: balance > 0.004 ? "warning.main" : "success.main",
            }}
          >
            {inr(balance)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {balance > 0.004
              ? "Pay on delivery or clear it with the supplier."
              : t("paidToYou") + " — nothing due."}
          </Typography>
        </CardContent>
      </Card>

      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {t("transactions")}
      </Typography>

      {txns.length === 0 ? (
        <Paper
          variant="outlined"
          sx={{ p: 4, textAlign: "center", borderRadius: 1.5 }}
        >
          <Typography color="text.secondary">{t("noTransactions")}</Typography>
        </Paper>
      ) : (
        txns.map((x) => (
          <Paper
            key={x.id}
            variant="outlined"
            sx={{ mb: 1, p: 1.5, borderRadius: 1.5 }}
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
                  {x.note ?? (x.orderId ? `Order #${x.orderId}` : "—")}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {new Date(x.createdAt).toLocaleString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                  {x.orderId ? ` · #${x.orderId}` : ""}
                </Typography>
              </Box>
              <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                <Typography
                  sx={{
                    fontWeight: 700,
                    color: x.amount >= 0 ? "warning.main" : "success.main",
                  }}
                >
                  {x.amount >= 0 ? "+" : "−"}
                  {inr(Math.abs(x.amount))}
                </Typography>
                <Chip
                  size="small"
                  label={
                    x.type === "CHARGE"
                      ? "Billed"
                      : x.type === "PAYMENT"
                        ? "Paid"
                        : "Adjusted"
                  }
                  color={
                    x.type === "CHARGE"
                      ? "warning"
                      : x.type === "PAYMENT"
                        ? "success"
                        : "info"
                  }
                />
              </Box>
            </Box>
          </Paper>
        ))
      )}
    </Box>
  );
}
