"use client";

import { useEffect, useState } from "react";
import { formatDateStr, formatMinutes } from "@/lib/format";
import { useLang } from "@/lib/i18n";
import { cx } from "@/utils/cx";

type Props = {
  open: boolean;
  closingSoon: boolean;
  closesAt: string | null;
  opensAt: string | null;
  startMinutes: number;
  endMinutes: number;
  deliveryNote: string | null;
  windowDate: string;
};

function useCountdown(iso: string | null) {
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!iso) return null;
  const diff = new Date(iso).getTime() - now;
  if (diff <= 0) return "expired";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  const s = Math.floor((diff % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

// Slim one-line status pill — no bulky card.
export default function WindowBanner(props: Props) {
  const { t } = useLang();
  const countdown = useCountdown(props.open ? props.closesAt : props.opensAt);

  const open = props.open && countdown !== "expired";

  return (
    <div
      role="status"
      className={cx(
        "mt-1 flex items-center gap-1.5 rounded-xl px-3 py-1.5 ring-1 ring-inset",
        open
          ? props.closingSoon
            ? "bg-warning-primary ring-utility-yellow-200"
            : "bg-success-primary ring-utility-green-200"
          : "bg-secondary ring-secondary",
      )}
    >
      <span
        className={cx(
          "size-2 shrink-0 rounded-full",
          open ? (props.closingSoon ? "bg-warning-solid" : "bg-success-solid") : "bg-quaternary",
        )}
      />
      <span
        className={cx(
          "text-sm font-bold",
          open
            ? props.closingSoon
              ? "text-warning-primary"
              : "text-success-primary"
            : "text-tertiary",
        )}
      >
        {open ? t("orderOpen") : t("orderClosed")}
      </span>
      {open && props.closingSoon && countdown && countdown !== "expired" && (
        <span
          className={cx(
            "text-sm font-bold tabular-nums",
            props.closingSoon ? "text-warning-primary" : "text-success-primary",
          )}
        >
          · {countdown}
        </span>
      )}
      {open && (
        <span className="ml-auto text-xs text-tertiary">
          {formatMinutes(props.endMinutes)} {t("closesAt")} · {t("delivery")}{" "}
          {formatDateStr(props.windowDate)}
        </span>
      )}
      {!open && countdown !== null && countdown !== "expired" && (
        <span className="ml-auto text-xs text-tertiary">
          {formatMinutes(props.startMinutes)} {t("opensAt")}
        </span>
      )}
    </div>
  );
}
