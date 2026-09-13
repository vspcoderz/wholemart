import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, users } from "@/db/schema";
import { Card, CardContent, Chip, Grid, Typography, Button, Box } from "@mui/material";
import Link from "next/link";
import { getWindowState, getSettings } from "@/lib/window";
import { formatMinutes } from "@/lib/format";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  formatDateStr,
  inr,
} from "@/lib/format";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const [win, cfg] = await Promise.all([getWindowState(), getSettings()]);

  const [vendorCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(users)
    .where(eq(users.role, "VENDOR"));
  const [productCount] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.active, true));

  const todayOrders = await db
    .select({
      id: orders.id,
      status: orders.status,
      windowDate: orders.windowDate,
      vendorName: users.businessName,
      total: sql<string>`coalesce(sum(coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity}) * ${orderItems.unitPrice}), 0)`,
      itemCount: sql<number>`count(${orderItems.id})::int`,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.vendorId))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.windowDate, win.windowDate))
    .groupBy(orders.id, orders.status, orders.windowDate, users.businessName)
    .orderBy(desc(orders.placedAt));

  const totalRevenue = todayOrders.reduce((s, o) => s + Number(o.total), 0);
  const pending = todayOrders.filter((o) => o.status === "PLACED").length;

  const stats = [
    { label: "Orders this window", value: String(todayOrders.length) },
    { label: "Window revenue", value: inr(totalRevenue) },
    { label: "Awaiting confirmation", value: String(pending) },
    { label: "Retailers", value: String(vendorCount.n) },
    { label: "Active products", value: String(productCount.n) },
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
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, flexWrap: "wrap" }}>
            <Chip
              label={win.open ? "Ordering OPEN" : "Ordering CLOSED"}
              color={win.open ? "success" : "default"}
              size="small"
            />
            <Typography color="text.secondary">
              Window: {formatMinutes(cfg.windowStartMinutes)} → {formatMinutes(cfg.windowEndMinutes)}{" "}
              next day ({cfg.timezone})
            </Typography>
          </Box>
          <Typography variant="body2" color="text.secondary">
            {win.open
              ? "Vendors can place and edit orders. Everything is delivered together after the window closes."
              : "Vendors are waiting for the next window. Deliveries from the last window are in progress."}
          </Typography>
        </CardContent>
      </Card>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Orders for {formatDateStr(win.windowDate)} window
        </Typography>
        <Link href="/admin/manifest">
          <Button size="small">Delivery manifest</Button>
        </Link>
      </Box>

      {todayOrders.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 1.5 }}>
          <Typography color="text.secondary">No orders in this window yet.</Typography>
        </Card>
      ) : (
        todayOrders.map((o) => (
          <Link key={o.id} href={`/admin/orders/${o.id}`} style={{ textDecoration: "none" }}>
            <Card variant="outlined" sx={{ borderRadius: 1.5, mb: 1, p: 2 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Box>
                  <Typography sx={{ fontWeight: 600 }}>{o.vendorName}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {o.itemCount} items · {inr(Number(o.total))}
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
