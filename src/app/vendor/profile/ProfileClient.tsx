"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { Logout, LockReset } from "@mui/icons-material";
import { useState, useTransition } from "react";
import { useLang, type Lang } from "@/lib/i18n";
import { changeMyPassword } from "@/lib/actions/account";

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
  const [pending, startTransition] = useTransition();
  const [dialog, setDialog] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [toast, setToast] = useState<{
    msg: string;
    severity: "success" | "error";
  } | null>(null);

  function submitPassword() {
    if (next !== confirm) {
      setToast({ msg: t("passwordMismatch"), severity: "error" });
      return;
    }
    if (next.length < 6) {
      setToast({ msg: t("passwordTooShort"), severity: "error" });
      return;
    }
    startTransition(async () => {
      const res = await changeMyPassword(current, next);
      if (res.ok) {
        setToast({ msg: t("passwordChanged"), severity: "success" });
        setDialog(false);
        setCurrent("");
        setNext("");
        setConfirm("");
      } else {
        setToast({
          msg:
            res.error === "WRONG_CURRENT"
              ? t("wrongPassword")
              : t("passwordTooShort"),
          severity: "error",
        });
      }
    });
  }

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
        <Box sx={{ display: "flex", gap: 1, mt: 2, flexWrap: "wrap" }}>
          <Button
            variant="outlined"
            startIcon={<LockReset />}
            onClick={() => setDialog(true)}
          >
            {t("changePassword")}
          </Button>
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

      <Dialog open={dialog} onClose={() => setDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>{t("changePassword")}</DialogTitle>
        <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
          <TextField
            label={t("currentPassword")}
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
          <TextField
            label={t("newPassword")}
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            helperText={t("passwordTooShort")}
          />
          <TextField
            label={t("confirmPassword")}
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialog(false)}>{t("cancel")}</Button>
          <Button variant="contained" onClick={submitPassword} disabled={pending}>
            {pending ? "…" : t("changePassword")}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast !== null}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
      >
        <Alert severity={toast?.severity ?? "success"} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
