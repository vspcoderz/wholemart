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
import { formatDateStr } from "@/lib/format";

export type DayRevenue = { windowDate: string; orders: number; revenue: number };
export type TopProduct = { name: string; qty: number; revenue: number };
export type TopRetailer = {
  name: string;
  orders: number;
  revenue: number;
  balance: number;
};
export type RecentOrder = {
  id: number;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  windowDate: string;
  vendorName: string;
  total: number;
  itemCount: number;
};

export default function DashboardClient({
  vendorCount,
  productCount,
  totalOrders,
  billedOrders,
  totalRevenue,
  outstanding,
  dayRevenue,
  topProducts,
  topRetailers,
  recentOrders,
}: {
  vendorCount: number;
  productCount: number;
  totalOrders: number;
  billedOrders: number;
  totalRevenue: number;
  outstanding: number;
  dayRevenue: DayRevenue[];
  topProducts: TopProduct[];
  topRetailers: TopRetailer[];
  recentOrders: RecentOrder[];
}) {
  const stats = [
    { label: "Total revenue", value: inr(totalRevenue) },
    { label: "Outstanding dues", value: inr(outstanding) },
    { label: "All orders", value: `${totalOrders} (${billedOrders} billed)` },
    { label: "Retailers", value: String(vendorCount) },
    { label: "Active products", value: String(productCount) },
  ];

  const maxDay = Math.max(1, ...dayRevenue.map((d) => d.revenue));

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Statistics
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Ordering is always open — it rolls into a new day at midnight.
        </Typography>
      </Box>

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

      <Grid container spacing={2} sx={{ mb: 3, alignItems: "stretch" }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 1.5, height: "100%" }}>
            <CardContent>
              <Typography gutterBottom sx={{ fontWeight: 700 }}>
                Revenue — last 7 days
              </Typography>
              {dayRevenue.length === 0 ? (
                <Typography color="text.secondary">No sales yet.</Typography>
              ) : (
                [...dayRevenue].reverse().map((d) => (
                  <Box key={d.windowDate} sx={{ mb: 1 }}>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <Typography variant="body2">
                        {formatDateStr(d.windowDate)} · {d.orders} orders
                      </Typography>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        {inr(d.revenue)}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: "action.hover",
                        overflow: "hidden",
                      }}
                    >
                      <Box
                        sx={{
                          height: "100%",
                          width: `${Math.round((d.revenue / maxDay) * 100)}%`,
                          bgcolor: "primary.main",
                          borderRadius: 4,
                        }}
                      />
                    </Box>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card variant="outlined" sx={{ borderRadius: 1.5, height: "100%" }}>
            <CardContent>
              <Typography gutterBottom sx={{ fontWeight: 700 }}>
                Top products (by revenue)
              </Typography>
              {topProducts.length === 0 ? (
                <Typography color="text.secondary">No sales yet.</Typography>
              ) : (
                topProducts.map((p, i) => (
                  <Box
                    key={p.name}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 0.75,
                      borderBottom: i < topProducts.length - 1 ? 1 : 0,
                      borderColor: "divider",
                    }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {i + 1}. {p.name}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        {p.qty} sold
                      </Typography>
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {inr(p.revenue)}
                    </Typography>
                  </Box>
                ))
              )}
              <Typography gutterBottom sx={{ fontWeight: 700, mt: 2 }}>
                Top retailers (by purchases)
              </Typography>
              {topRetailers.length === 0 ? (
                <Typography color="text.secondary">No sales yet.</Typography>
              ) : (
                topRetailers.map((r) => (
                  <Box
                    key={r.name}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      py: 0.5,
                    }}
                  >
                    <Typography variant="body2">
                      {r.name}
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ ml: 1 }}
                      >
                        {r.orders} orders
                        {r.balance > 0.004 && ` · owes ${inr(r.balance)}`}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {inr(r.revenue)}
                    </Typography>
                  </Box>
                ))
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Recent orders
        </Typography>
        <Link href="/admin/orders">
          <Button size="small">Full history</Button>
        </Link>
      </Box>

      {recentOrders.length === 0 ? (
        <Card
          variant="outlined"
          sx={{ p: 4, textAlign: "center", borderRadius: 1.5 }}
        >
          <Typography color="text.secondary">No orders yet.</Typography>
        </Card>
      ) : (
        recentOrders.map((o) => (
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
                    {formatDateStr(o.windowDate)} · {o.itemCount} items ·{" "}
                    {inr(o.total)}
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
