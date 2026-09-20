import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { Box, Typography, TextField, Button } from "@mui/material";
import { getWindowState } from "@/lib/window";
import { formatDateStr, inr } from "@/lib/format";
import OrdersClient from "./OrdersClient";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await props.searchParams;
  const win = await getWindowState();
  const windowDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : win.windowDate;

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      placedAt: orders.placedAt,
      vendorName: users.businessName,
      vendorId: users.id,
      total: sql<string>`coalesce(sum(coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity}) * ${orderItems.unitPrice}), 0)`,
      itemCount: sql<number>`count(${orderItems.id})::int`,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.vendorId))
    .leftJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(eq(orders.windowDate, windowDate))
    .groupBy(orders.id, orders.status, orders.placedAt, users.businessName, users.id)
    .orderBy(desc(orders.placedAt));

  const grandTotal = rows.reduce((s, r) => s + Number(r.total), 0);

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 2,
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Orders
        </Typography>
        <form>
          <TextField
            name="date"
            type="date"
            label="Window date"
            defaultValue={windowDate}
            size="small"
            sx={{ width: 200 }}
          />
          <Button type="submit" variant="contained" sx={{ ml: 1 }}>
            View
          </Button>
        </form>
      </Box>

      <Typography color="text.secondary" gutterBottom>
        {formatDateStr(windowDate)} window · {rows.length} orders ·{" "}
        {inr(grandTotal)} total
      </Typography>

      <OrdersClient
        rows={rows.map((o) => ({
          id: o.id,
          status: o.status,
          placedAt:
            o.placedAt instanceof Date
              ? o.placedAt.toISOString()
              : String(o.placedAt),
          vendorName: o.vendorName,
          total: Number(o.total),
          itemCount: o.itemCount,
        }))}
      />
    </Box>
  );
}
