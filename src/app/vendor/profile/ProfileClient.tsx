"use client";

import {
  Box,
  Button,
  Card,
  Chip,
  Divider,
  Typography,
} from "@mui/material";
import { Logout } from "@mui/icons-material";
import { useLang, type Lang } from "@/lib/i18n";

export default function ProfileClient({
  businessName,
  contactPerson,
  phone,
  address,
  email,
  signOutAction,
}: {
  businessName: string;
  contactPerson: string | null;
  phone: string | null;
  address: string | null;
  email: string;
  signOutAction: () => Promise<void>;
}) {
  const { t, lang, setLang } = useLang();

  const rows: [string, string | null][] = [
    [t("contactPerson"), contactPerson],
    [t("phone"), phone],
    [t("deliveryAddress"), address],
    [t("email"), email],
  ];

  return (
    <Box sx={{ pb: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
        {t("profile")}
      </Typography>
      <Card variant="outlined" sx={{ p: 3, borderRadius: 1.5 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }} gutterBottom>
          {businessName}
        </Typography>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          {t("profileInfo")}
        </Typography>
        <Divider sx={{ my: 2 }} />
        {rows.map(([label, value]) => (
          <Box key={label} sx={{ mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
            <Typography>{value || "—"}</Typography>
          </Box>
        ))}
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography variant="body2" color="text.secondary">
            भाषा / Language
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            {(["mr", "en"] as Lang[]).map((l) => (
              <Chip
                key={l}
                label={l === "mr" ? "मराठी" : "English"}
                color={lang === l ? "primary" : "default"}
                variant={lang === l ? "filled" : "outlined"}
                onClick={() => setLang(l)}
              />
            ))}
          </Box>
        </Box>
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="outlined"
            color="error"
            startIcon={<Logout />}
            sx={{ mt: 2 }}
          >
            {t("signOut")}
          </Button>
        </form>
      </Card>
    </Box>
  );
}
