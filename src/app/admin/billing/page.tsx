import { Suspense } from "react";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, products, users } from "@/db/schema";
import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Skeleton,
  TextField,
  Typography,
} from "@mui/material";
import { getWindowState } from "@/lib/window";
import { formatDateStr, inr } from "@/lib/format";
import BillingClient, {
  type BillingOrder,
} from "./BillingClient";

export const metadata = { title: "Billing" };

function lineTotal(qty: number, price: number) {
  return qty * price;
}

export default async function BillingPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await props.searchParams;
  const win = await getWindowState();
  const windowDate =
    date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : win.windowDate;

  const orderRows = await db
    .select({
      id: orders.id,
      status: orders.status,
      vendorName: users.businessName,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.vendorId))
    .where(eq(orders.windowDate, windowDate))
    .orderBy(desc(orders.placedAt));

  const billedOrders: BillingOrder[] = await Promise.all(
    orderRows.map(async (o) => {
      const items = await db
        .select({
          id: orderItems.id,
          productId: orderItems.productId,
          productName: orderItems.productName,
          category: products.category,
          unit: orderItems.unit,
          unitPrice: orderItems.unitPrice,
          quantity: orderItems.quantity,
          confirmedQuantity: orderItems.confirmedQuantity,
        })
        .from(orderItems)
        .leftJoin(products, eq(products.id, orderItems.productId))
        .where(eq(orderItems.orderId, o.id));
      return {
        id: o.id,
        status: o.status,
        vendorName: o.vendorName,
        items: items.map((i) => ({
          id: i.id,
          productId: i.productId,
          productName: i.productName,
          category: i.category,
          unit: i.unit,
          unitPrice: Number(i.unitPrice),
          quantity: Number(i.quantity),
          confirmedQuantity:
            i.confirmedQuantity === null ? null : Number(i.confirmedQuantity),
        })),
      };
    }),
  );

  const live = billedOrders.filter((o) => o.status !== "CANCELLED");
  const orderValue = (o: BillingOrder) =>
    o.items.reduce(
      (s, i) => s + lineTotal(i.confirmedQuantity ?? i.quantity, i.unitPrice),
      0,
    );
  const pending = live.filter((o) => o.status === "PLACED");
  const billed = live.filter((o) => o.status !== "PLACED");
  const pendingValue = pending.reduce((s, o) => s + orderValue(o), 0);
  const billedValue = billed.reduce((s, o) => s + orderValue(o), 0);

  const cards = [
    { label: "Orders", value: String(live.length) },
    {
      label: "Pending billing",
      value: `${pending.length} · ${inr(pendingValue)}`,
    },
    { label: "Billed", value: `${billed.length} · ${inr(billedValue)}` },
    { label: "Day value", value: inr(pendingValue + billedValue) },
  ];

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
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Billing
          </Typography>
          <Typography color="text.secondary">
            {formatDateStr(windowDate)} window · pick orders, set today&apos;s
            rate, finalize
          </Typography>
        </Box>
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

      <Grid container spacing={2} sx={{ mb: 2 }}>
        {cards.map((c) => (
          <Grid size={{ xs: 6, md: 3 }} key={c.label}>
            <Card variant="outlined" sx={{ borderRadius: 1.5, height: "100%" }}>
              <CardContent>
                <Typography variant="caption" color="text.secondary">
                  {c.label}
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {c.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Suspense
        fallback={
          <Card variant="outlined" sx={{ borderRadius: 1.5, p: 2 }}>
            <Skeleton variant="rectangular" height={56} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={220} />
          </Card>
        }
      >
        <BillingClient windowDate={windowDate} orders={billedOrders} />
      </Suspense>
    </Box>
  );
}
