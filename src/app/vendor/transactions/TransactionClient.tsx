"use client";

import { Box, Tab, Tabs } from "@mui/material";
import { useState } from "react";
import VendorOrdersList from "../orders/OrdersClient";
import AccountView from "../account/AccountClient";
import { useLang } from "@/lib/i18n";

export type VendorOrderRow = {
  id: number;
  windowDate: string;
  status: "PLACED" | "CONFIRMED" | "DELIVERED" | "CANCELLED";
  adminNote: string | null;
  itemCount: number;
  total: number;
  currentWindow: boolean;
};

export type LedgerTxn = {
  id: number;
  type: "CHARGE" | "PAYMENT" | "ADJUSTMENT";
  amount: number;
  note: string | null;
  orderId: number | null;
  createdAt: string;
};

export default function TransactionClient({
  initialTab,
  orders,
  currentWindowOpen,
  businessName,
  balance,
  txns,
}: {
  initialTab: "orders" | "account";
  orders: VendorOrderRow[];
  currentWindowOpen: boolean;
  businessName: string;
  balance: number;
  txns: LedgerTxn[];
}) {
  const { t } = useLang();
  const [tab, setTab] = useState(initialTab);

  return (
    <Box sx={{ pb: 2 }}>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 1.5 }}>
        <Tab value="orders" label={t("myOrders")} />
        <Tab value="account" label={t("transactions")} />
      </Tabs>
      {tab === "orders" ? (
        <VendorOrdersList orders={orders} currentWindowOpen={currentWindowOpen} />
      ) : (
        <AccountView
          businessName={businessName}
          balance={balance}
          txns={txns}
        />
      )}
    </Box>
  );
}
