"use client";

import { useState } from "react";
import { Badge } from "@/components/base/badges/badges";
import { EmptyState } from "@/components/application/empty-state/empty-state";
import { Tab, TabList, Tabs } from "@/components/application/tabs/tabs";
import { inr } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import VendorOrdersList from "../orders/OrdersClient";
import AccountView from "../account/AccountClient";
import { cx } from "@/utils/cx";

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
    <div className="pb-2">
      <Tabs selectedKey={tab} onSelectionChange={(k) => setTab(k as "orders" | "account")}>
        <TabList type="underline" size="sm">
          <Tab id="orders" label={t("myOrders")} badge={orders.length} />
          <Tab id="account" label={t("transactions")} badge={txns.length} />
        </TabList>
      </Tabs>
      <div className="mt-2">
        {tab === "orders" ? (
          <VendorOrdersList orders={orders} currentWindowOpen={currentWindowOpen} />
        ) : (
          <AccountView businessName={businessName} balance={balance} txns={txns} />
        )}
      </div>
    </div>
  );
}

export function TxnBadge({ type }: { type: LedgerTxn["type"] }) {
  return (
    <Badge
      size="sm"
      type="pill-color"
      color={type === "CHARGE" ? "warning" : type === "PAYMENT" ? "success" : "blue"}
    >
      {type === "CHARGE" ? "Billed" : type === "PAYMENT" ? "Paid" : "Adjusted"}
    </Badge>
  );
}

export function txnDate(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export function TxnAmount({ amount }: { amount: number }) {
  return (
    <span className={cx("font-bold", amount >= 0 ? "text-warning-primary" : "text-success-primary")}>
      {amount >= 0 ? "+" : "−"}
      {inr(Math.abs(amount))}
    </span>
  );
}

export function VendorEmpty({ title }: { title: string }) {
  return (
    <EmptyState size="md">
      <EmptyState.FeaturedIcon color="gray" />
      <EmptyState.Title>{title}</EmptyState.Title>
    </EmptyState>
  );
}
