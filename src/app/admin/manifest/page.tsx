import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { orderItems, orders, users } from "@/db/schema";
import { Box, Button, Card, CardContent, Typography, TextField, Chip } from "@mui/material";
import { PictureAsPdf } from "@mui/icons-material";
import PrintButton from "./PrintButton";
import { getWindowState } from "@/lib/window";
import { UNIT_LABELS, formatDateStr } from "@/lib/format";
import type { Unit } from "@/db/schema";

export const metadata = { title: "Accounting" };

export default async function ManifestPage(props: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await props.searchParams;
  const win = await getWindowState();
  const windowDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : win.windowDate;

  // Procurement: total needed per product across all non-cancelled orders
  const productTotals = await db
    .select({
      productId: orderItems.productId,
      name: orderItems.productName,
      unit: orderItems.unit,
      needed: sql<string>`sum(coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity}))`,
      vendors: sql<number>`count(distinct ${orders.vendorId})::int`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orders.id, orderItems.orderId))
    .where(sql`${orders.windowDate} = ${windowDate} and ${orders.status} <> 'CANCELLED'`)
    .groupBy(orderItems.productId, orderItems.productName, orderItems.unit);

  // Per-vendor delivery list
  const vendorOrders = await db
    .select({
      orderId: orders.id,
      vendorName: users.businessName,
      address: users.address,
      phone: users.phone,
      status: orders.status,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.vendorId))
    .where(sql`${orders.windowDate} = ${windowDate} and ${orders.status} <> 'CANCELLED'`)
    .groupBy(orders.id, users.businessName, users.address, users.phone, orders.status);

  const vendorItems = await Promise.all(
    vendorOrders.map(async (o) => ({
      ...o,
      items: await db
        .select({
          name: orderItems.productName,
          unit: orderItems.unit,
          qty: sql<string>`coalesce(${orderItems.confirmedQuantity}, ${orderItems.quantity})`,
        })
        .from(orderItems)
        .where(eq(orderItems.orderId, o.orderId)),
    })),
  );

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }}>
          Delivery manifest — {formatDateStr(windowDate)} window
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <form>
            <TextField
              name="date"
              type="date"
              size="small"
              defaultValue={windowDate}
              sx={{ width: 180 }}
            />
            <Button type="submit" variant="contained" sx={{ ml: 1 }}>
              View
            </Button>
          </form>
          <Button
            variant="outlined"
            href={`/api/manifest/pdf?date=${windowDate}`}
            target="_blank"
            startIcon={<PictureAsPdf />}
          >
            PDF
          </Button>
          <PrintButton />
        </Box>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 1.5, mb: 3, printColorAdjust: "exact" }}>
        <CardContent>
          <Typography gutterBottom sx={{ fontWeight: 700 }}>
            What to buy / prepare ({productTotals.length} products)
          </Typography>
          {productTotals.length === 0 ? (
            <Typography color="text.secondary">No orders for this window.</Typography>
          ) : (
            <Box component="table" sx={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Product", "Total needed", "Vendors"].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        borderBottom: "2px solid",
                        borderColor: "divider",
                        padding: 8,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {productTotals.map((p) => (
                  <tr key={`${p.productId ?? "deleted"}-${p.name}-${p.unit}`}>
                    <td style={{ padding: 8, borderBottom: "1px solid", borderColor: "divider" }}>
                      <strong>{p.name}</strong>
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid", borderColor: "divider" }}>
                      {Number(p.needed)} {UNIT_LABELS[p.unit as Unit]}
                    </td>
                    <td style={{ padding: 8, borderBottom: "1px solid", borderColor: "divider" }}>
                      {p.vendors}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Box>
          )}
        </CardContent>
      </Card>

      <Typography variant="h6" gutterBottom sx={{ fontWeight: 700 }}>
        Per-retailer delivery list ({vendorOrders.length})
      </Typography>
      {vendorItems.map((o) => (
        <Card key={o.orderId} variant="outlined" sx={{ borderRadius: 1.5, mb: 1, printColorAdjust: "exact" }}>
          <CardContent>
            <Box sx={{ display: "flex", justifyContent: "space-between" }}>
              <Typography sx={{ fontWeight: 700 }}>{o.vendorName}</Typography>
              <Chip label={o.status} size="small" />
            </Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {o.address ?? "no address"} · {o.phone ?? "no phone"}
            </Typography>
            {o.items.map((it, idx) => (
              <Typography key={idx} variant="body2">
                • {it.name}: {Number(it.qty)} {UNIT_LABELS[it.unit as Unit]}
              </Typography>
            ))}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
