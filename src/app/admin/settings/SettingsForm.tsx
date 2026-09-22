"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/base/buttons/button";
import { TextArea } from "@/components/base/textarea/textarea";
import { Select } from "@/components/base/select/select";
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
  const [pending, setPending] = useState(false);
  const [start, setStart] = useState(minutesToHHMM(initial.windowStartMinutes));
  const [end, setEnd] = useState(minutesToHHMM(initial.windowEndMinutes));
  const [timezone, setTimezone] = useState(initial.timezone);
  const [language, setLanguage] = useState<"mr" | "en">(initial.language);
  const [deliveryNote, setDeliveryNote] = useState(initial.deliveryNote);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  async function save() {
    setPending(true);
    try {
      const res = await updateSettings({
        windowStartMinutes: hhmmToMinutes(start),
        windowEndMinutes: hhmmToMinutes(end),
        timezone,
        language,
        deliveryNote,
      });
      setToast(
        res.ok
          ? { msg: "Settings saved.", ok: true }
          : { msg: res.error ?? "Save failed.", ok: false },
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="max-w-160">
      <section className="rounded-xl bg-primary p-4 shadow-xs ring-1 ring-secondary sm:p-6">
        <div className="flex flex-col gap-5">
          <div>
            <h2 className="text-md font-semibold text-primary">Ordering window</h2>
            <p className="mt-0.5 text-sm text-tertiary">
              Shops can order from 12:00 AM to 10:00 PM. 10 PM – midnight is closed for
              deliveries, then a new order day starts at midnight.
            </p>
            <div className="mt-3 flex gap-2">
              <div className="flex-1">
                <label
                  htmlFor="window-start"
                  className="mb-1.5 block text-sm font-medium text-secondary"
                >
                  Opens at
                </label>
                <input
                  id="window-start"
                  type="time"
                  step={300}
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="h-10 w-full rounded-lg bg-primary px-3 text-sm text-primary shadow-xs ring-1 ring-primary outline-focus-ring ring-inset focus-visible:outline-2"
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="window-end"
                  className="mb-1.5 block text-sm font-medium text-secondary"
                >
                  Closes at (next day)
                </label>
                <input
                  id="window-end"
                  type="time"
                  step={300}
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="h-10 w-full rounded-lg bg-primary px-3 text-sm text-primary shadow-xs ring-1 ring-primary outline-focus-ring ring-inset focus-visible:outline-2"
                />
              </div>
            </div>
          </div>

          <Select
            size="md"
            label="Timezone"
            items={TIMEZONES.map((t) => ({ id: t, label: t }))}
            selectedKey={timezone}
            onSelectionChange={(k) => setTimezone(String(k))}
          >
            {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
          </Select>

          <Select
            size="md"
            label="Vendor app language (default)"
            hint="Marathi is the default; vendors can still switch in their profile."
            items={[
              { id: "mr", label: "मराठी (Marathi)" },
              { id: "en", label: "English" },
            ]}
            selectedKey={language}
            onSelectionChange={(k) => setLanguage(String(k) as "mr" | "en")}
          >
            {(item) => <Select.Item key={item.id} id={item.id} label={item.label} />}
          </Select>

          <TextArea
            label="Delivery note shown to vendors"
            placeholder="e.g. Deliveries happen between 6 AM and 9 AM"
            value={deliveryNote}
            onChange={(v: string) => setDeliveryNote(v)}
            rows={2}
          />

          <div>
            <Button size="md" color="primary" isLoading={pending} onClick={save}>
              Save settings
            </Button>
            {toast && (
              <p
                role="status"
                className={toast.ok ? "mt-2 text-sm text-success-primary" : "mt-2 text-sm text-error-primary"}
              >
                {toast.msg}
              </p>
            )}
          </div>

          <p className="rounded-lg bg-brand-primary p-3 text-sm text-brand-secondary ring-1 ring-brand ring-inset">
            The 10 PM – midnight gap is delivery time: vendors can&apos;t order, and a new day
            starts at midnight. Orders already placed keep the date they were placed under.
          </p>
        </div>
      </section>
    </div>
  );
}
