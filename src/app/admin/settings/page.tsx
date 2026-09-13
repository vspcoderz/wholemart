import { getSettings } from "@/lib/window";
import { formatMinutes } from "@/lib/format";
import SettingsForm from "./SettingsForm";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const cfg = await getSettings();
  return (
    <SettingsForm
      initial={{
        windowStartMinutes: cfg.windowStartMinutes,
        windowEndMinutes: cfg.windowEndMinutes,
        timezone: cfg.timezone,
        language: cfg.language,
        deliveryNote: cfg.deliveryNote ?? "",
      }}
      label={{
        start: formatMinutes(cfg.windowStartMinutes),
        end: formatMinutes(cfg.windowEndMinutes),
      }}
    />
  );
}
