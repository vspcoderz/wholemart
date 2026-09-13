import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import {
  Box,
  Card,
  Chip,
  Typography,
  TextField,
  Button,
} from "@mui/material";
import Link from "next/link";
import { getWindowState } from "@/lib/window";
import {
  ORDER_STATUS_COLORS,
  ORDER_STATUS_LABELS,
  formatDateStr,
  inr,
} from "@/lib/format";

export const metadata = { title: "Orders" };

export default async function AdminOrdersPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await props.searchParams;
  const win = await getWindowState();
  const windowDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : win.windowDate;

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
        {formatDateStr(windowDate)} window · {rows.length} orders · {inr(grandTotal)} total
      </Typography>

      {rows.length === 0 ? (
        <Card variant="outlined" sx={{ p: 4, textAlign: "center", borderRadius: 1.5 }}>
          <Typography color="text.secondary">No orders for this window.</Typography>
        </Card>
      ) : (
        rows.map((o) => (
          <Link
            key={o.id}
            href={`/admin/orders/${o.id}`}
            style={{ textDecoration: "none" }}
          >
            <Card
              variant="outlined"
              sx={{ borderRadius: 1.5, mb: 1, p: 2 }}
            >
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
