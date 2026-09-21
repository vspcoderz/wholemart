"use client";

import { Box, Tab, Tabs, Typography } from "@mui/material";
import { useState } from "react";

export default function SettingsTabs({
  initialTab,
  general,
  products,
  retailers,
}: {
  initialTab: "general" | "products" | "retailers";
  general: React.ReactNode;
  products: React.ReactNode;
  retailers: React.ReactNode;
}) {
  const [tab, setTab] = useState(initialTab);

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Settings
      </Typography>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ mb: 2 }}
      >
        <Tab value="general" label="General" />
        <Tab value="products" label="Products" />
        <Tab value="retailers" label="Retailers" />
      </Tabs>
      {tab === "general" && general}
      {tab === "products" && products}
      {tab === "retailers" && retailers}
    </Box>
  );
}
