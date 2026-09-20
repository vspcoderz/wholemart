"use client";

import {
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Typography,
} from "@mui/material";

export type BillingStat = { label: string; value: string };

export default function BillingHeader({
  windowDate,
  windowLabel,
  cards,
}: {
  windowDate: string;
  windowLabel: string;
  cards: BillingStat[];
}) {
  return (
    <>
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
          <Typography color="text.secondary">{windowLabel}</Typography>
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
    </>
  );
}
