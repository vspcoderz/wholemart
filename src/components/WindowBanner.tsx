"use client";

import { Box, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { formatMinutes } from "@/lib/format";
import { useLang } from "@/lib/i18n";

type Props = {
  open: boolean;
  closingSoon: boolean;
  closesAt: string | null;
  opensAt: string | null;
  startMinutes: number;
  endMinutes: number;
  deliveryNote: string | null;
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
  const color = open ? (props.closingSoon ? "#b45309" : "#166534") : "#5c615c";
  const bg = open ? (props.closingSoon ? "#fef3c7" : "#dcfce7") : "#e5e7e5";

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        borderRadius: 1.5,
        px: 1.5,
        py: 0.75,
        bgcolor: bg,
        mt: 1,
      }}
      role="status"
    >
      <Box
        sx={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          bgcolor: color,
          flexShrink: 0,
        }}
      />
      <Typography sx={{ fontWeight: 700, fontSize: 14, color }}>
        {open ? t("orderOpen") : t("orderClosed")}
      </Typography>
      {open && props.closingSoon && countdown && countdown !== "expired" && (
        <Typography sx={{ fontWeight: 700, fontSize: 14, color, fontVariantNumeric: "tabular-nums" }}>
          · {countdown}
        </Typography>
      )}
      {open && (
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", ml: "auto" }}>
          {formatMinutes(props.endMinutes)} {t("closesAt")}
        </Typography>
      )}
      {!open && countdown !== null && countdown !== "expired" && (
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", ml: "auto" }}>
          {formatMinutes(props.startMinutes)} {t("opensAt")}
        </Typography>
      )}
    </Box>
  );
}
