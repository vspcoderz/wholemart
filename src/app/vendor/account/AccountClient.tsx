"use client";

import { inr } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { TxnAmount, TxnBadge, VendorEmpty, txnDate } from "../transactions/TransactionClient";
import { cx } from "@/utils/cx";

type Txn = {
  id: number;
  type: "CHARGE" | "PAYMENT" | "ADJUSTMENT";
  amount: number;
  note: string | null;
  orderId: number | null;
  createdAt: string;
};

export default function AccountClient({
  businessName,
  balance,
  txns,
}: {
  businessName: string;
  balance: number;
  txns: Txn[];
}) {
  const { t } = useLang();
  const owes = balance > 0.004;

  return (
    <div className="pb-2">
      <h1 className="mb-2 text-md font-semibold text-primary">{businessName}</h1>

      <section className="mb-3 rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary">
        <p className="text-xs text-quaternary">{t("balanceOwed")}</p>
        <p className={cx("mt-0.5 text-display-sm font-bold", owes ? "text-warning-primary" : "text-success-primary")}>
          {inr(balance)}
        </p>
        <p className="mt-0.5 text-sm text-tertiary">
          {owes ? "Pay on delivery or clear it with the supplier." : `${t("paidToYou")} — nothing due.`}
        </p>
      </section>

      <h2 className="mb-2 text-md font-semibold text-primary">{t("transactions")}</h2>

      {txns.length === 0 ? (
        <VendorEmpty title={t("noTransactions")} />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {txns.map((x) => (
            <li
              key={x.id}
              className="rounded-xl bg-primary p-3.5 shadow-xs ring-1 ring-secondary"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-primary">
                    {x.note ?? (x.orderId ? `Order #${x.orderId}` : "—")}
                  </p>
                  <p className="mt-0.5 text-sm text-tertiary">
                    {txnDate(x.createdAt)}
                    {x.orderId ? ` · #${x.orderId}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1 text-sm">
                  <TxnAmount amount={x.amount} />
                  <TxnBadge type={x.type} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
