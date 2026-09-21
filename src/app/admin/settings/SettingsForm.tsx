"use client";

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  MenuItem,
  Snackbar,
  TextField,
  Typography,
} from "@mui/material";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateSettings } from "@/lib/actions/admin";

const TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
];

function minutesToHHMM(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}
function hhmmToMinutes(v: string) {
  const [h, m] = v.split(":").map(Number);
  return h * 60 + m;
}

export default function SettingsForm({
  initial,
}: {
  initial: {
    windowStartMinutes: number;
    windowEndMinutes: number;
    timezone: string;
    language: "mr" | "en";
    deliveryNote: string;
  };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [start, setStart] = useState(minutesToHHMM(initial.windowStartMinutes));
  const [end, setEnd] = useState(minutesToHHMM(initial.windowEndMinutes));
  const [timezone, setTimezone] = useState(initial.timezone);
  const [language, setLanguage] = useState<"mr" | "en">(initial.language);
  const [deliveryNote, setDeliveryNote] = useState(initial.deliveryNote);
  const [toast, setToast] = useState<{ msg: string; severity: "success" | "error" } | null>(null);

  function save() {
    startTransition(async () => {
      const res = await updateSettings({
        windowStartMinutes: hhmmToMinutes(start),
        windowEndMinutes: hhmmToMinutes(end),
        timezone,
        language,
        deliveryNote,
      });
      setToast(
        res.ok
          ? { msg: "Settings saved.", severity: "success" }
          : { msg: res.error ?? "Save failed.", severity: "error" },
      );
      router.refresh();
    });
  }

  return (
    <Box sx={{ maxWidth: 640 }}>
      <Card variant="outlined" sx={{ borderRadius: 1.5 }}>
        <CardContent sx={{ display: "grid", gap: 3 }}>
          <Box>
            <Typography gutterBottom sx={{ fontWeight: 700 }}>
              Ordering window
            </Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Ordering stays open around the clock — these times are kept for
              reference only. A new order day starts at midnight.
            </Typography>
            <Box sx={{ display: "flex", gap: 2, mt: 1 }}>
              <TextField
                label="Opens at"
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                fullWidth
                slotProps={{ htmlInput: { step: 300 } }}
              />
              <TextField
                label="Closes at (next day)"
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                fullWidth
                slotProps={{ htmlInput: { step: 300 } }}
              />
            </Box>
          </Box>

          <TextField
            select
            label="Timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
          >
            {TIMEZONES.map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Vendor app language (default)"
            value={language}
            onChange={(e) => setLanguage(e.target.value as "mr" | "en")}
            helperText="Marathi is the default; vendors can still switch in their profile."
          >
            <MenuItem value="mr">मराठी (Marathi)</MenuItem>
            <MenuItem value="en">English</MenuItem>
          </TextField>

          <TextField
            label="Delivery note shown to vendors"
            multiline
            rows={2}
            value={deliveryNote}
            onChange={(e) => setDeliveryNote(e.target.value)}
            placeholder="e.g. Deliveries happen between 6 AM and 9 AM"
          />

          <Box>
            <Button variant="contained" onClick={save} disabled={pending}>
              {pending ? "Saving…" : "Save settings"}
            </Button>
          </Box>

          <Alert severity="info">
            Ordering never closes, so window times don&apos;t block anyone.
            Orders already placed keep the date they were placed under.
          </Alert>
        </CardContent>
      </Card>

      <Snackbar open={toast !== null} autoHideDuration={3000} onClose={() => setToast(null)}>
        <Alert severity={toast?.severity ?? "success"} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
