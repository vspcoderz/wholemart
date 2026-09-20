"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  TextField,
  Typography,
} from "@mui/material";
import { PictureAsPdf } from "@mui/icons-material";
import PrintButton from "./PrintButton";
import { UNIT_LABELS, formatDateStr } from "@/lib/format";
import type { Unit } from "@/db/schema";

type ProductTotal = {
  productId: number | null;
  name: string;
  unit: string;
  needed: number;
  vendors: number;
};

type VendorOrder = {
  orderId: number;
  vendorName: string;
  address: string | null;
  phone: string | null;
  status: string;
  items: { name: string; unit: string; qty: number }[];
};

export default function ManifestClient({
  windowDate,
  productTotals,
  vendorItems,
}: {
  windowDate: string;
  productTotals: ProductTotal[];
  vendorItems: VendorOrder[];
}) {
  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mb: 1,
        }}
      >
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

      <Card
        variant="outlined"
        sx={{ borderRadius: 1.5, mb: 3, printColorAdjust: "exact" }}
      >
        <CardContent>
          <Typography gutterBottom sx={{ fontWeight: 700 }}>
            What to buy / prepare ({productTotals.length} products)
          </Typography>
          {productTotals.length === 0 ? (
            <Typography color="text.secondary">
              No orders for this window.
            </Typography>
          ) : (
            <Box
              component="table"
              sx={{ width: "100%", borderCollapse: "collapse" }}
            >
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
                  <tr
                    key={`${p.productId ?? "deleted"}-${p.name}-${p.unit}`}
                  >
                    <td
                      style={{
                        padding: 8,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      <strong>{p.name}</strong>
                    </td>
                    <td
                      style={{
                        padding: 8,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
                      {p.needed} {UNIT_LABELS[p.unit as Unit]}
                    </td>
                    <td
                      style={{
                        padding: 8,
                        borderBottom: "1px solid",
                        borderColor: "divider",
                      }}
                    >
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
        Per-retailer delivery list ({vendorItems.length})
      </Typography>
      {vendorItems.map((o) => (
        <Card
          key={o.orderId}
          variant="outlined"
          sx={{ borderRadius: 1.5, mb: 1, printColorAdjust: "exact" }}
        >
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
                • {it.name}: {it.qty} {UNIT_LABELS[it.unit as Unit]}
              </Typography>
            ))}
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}
