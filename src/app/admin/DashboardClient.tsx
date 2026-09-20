"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { ORDER_STATUS_COLORS, ORDER_STATUS_LABELS, inr } from "@/lib/format";
import { formatMinutes, formatDateStr } from "@/lib/format";

export type DashboardOrder = {
  id: number;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  windowDate: string;
  vendorName: string;
  total: number;
  itemCount: number;
};

export type DashboardProps = {
  windowOpen: boolean;
  windowDate: string;
  windowStartMinutes: number;
  windowEndMinutes: number;
  timezone: string;
  deliveryNote: string;
  vendorCount: number;
  productCount: number;
  orders: DashboardOrder[];
};

export default function DashboardClient({
  windowOpen,
  windowDate,
  windowStartMinutes,
  windowEndMinutes,
  timezone,
  deliveryNote,
  vendorCount,
  productCount,
  orders,
}: DashboardProps) {
  const totalRevenue = orders.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === "PLACED").length;

  const stats = [
    { label: "Orders this window", value: String(orders.length) },
    { label: "Window revenue", value: inr(totalRevenue) },
    { label: "Awaiting confirmation", value: String(pending) },
    { label: "Retailers", value: String(vendorCount) },
    { label: "Active products", value: String(productCount) },
  ];

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Dashboard
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        {stats.map((s) => (
          <Grid size={{ xs: 6, md: 2.4 }} key={s.label}>
            <Card variant="outlined" sx={{ borderRadius: 1.5, height: "100%" }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {s.label}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card variant="outlined" sx={{ borderRadius: 1.5, mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 1,
              flexWrap: "wrap",
            }}
          >
            <Chip
              label={windowOpen ? "Ordering OPEN" : "Ordering CLOSED"}
              color={windowOpen ? "success" : "default"}
              size="small"
            />
            <Typography color="text.secondary">
              Window: {formatMinutes(windowStartMinutes)} →{" "}
              {formatMinutes(windowEndMinutes)} next day ({timezone})
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {windowOpen
              ? "Vendors can place and edit orders. Everything is delivered together after the window closes."
              : "Vendors are waiting for the next window. Deliveries from the last window are in progress."}
          </Typography>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Orders for {formatDateStr(windowDate)} window
        </Typography>
        <Link href="/admin/manifest">
          <Button size="small">Delivery manifest</Button>
        </Link>
      </Box>

      {orders.length === 0 ? (
        <Card
          variant="outlined"
          sx={{ p: 4, textAlign: "center", borderRadius: 1.5 }}
        >
          <Typography color="text.secondary">
            No orders in this window yet.
          </Typography>
        </Card>
      ) : (
        orders.map((o) => (
          <Link
            key={o.id}
            href={`/admin/orders/${o.id}`}
            style={{ textDecoration: "none" }}
          >
            <Card variant="outlined" sx={{ borderRadius: 1.5, mb: 1, p: 2 }}>
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
