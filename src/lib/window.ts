import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";

export type WindowSettings = {
  windowStartMinutes: number; // minutes from midnight, e.g. 23*60
  windowEndMinutes: number;
  timezone: string;
  language: "mr" | "en";
  deliveryNote: string | null;
};

const DEFAULTS: WindowSettings = {
  windowStartMinutes: 23 * 60, // 11:00 PM
  windowEndMinutes: 22 * 60, // 10:00 PM next day
  timezone: "Asia/Kolkata",
  language: "mr",
  deliveryNote: null,
};

export async function getSettings(): Promise<WindowSettings> {
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.id, 1))
    .limit(1);
  if (!row) return DEFAULTS;
  return {
    windowStartMinutes: row.windowStartMinutes,
    windowEndMinutes: row.windowEndMinutes,
    timezone: row.timezone,
    language: row.language === "en" ? "en" : "mr",
    deliveryNote: row.deliveryNote,
  };
}

/** Current wall-clock date/time in the given IANA timezone. */
function nowInTz(tz: string): { dateStr: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour")) % 24;
  const minutes = hour * 60 + Number(get("minute"));
  return { dateStr, minutes };
}

/**
 * Convert "wall clock" date + minutes-of-day in a timezone to an absolute UTC Date.
 * Two-pass algorithm to resolve DST/offset correctly.
 */
function wallClockToUtc(
  dateStr: string,
  minutes: number,
  tz: string,
): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const naive = Date.UTC(y, m - 1, d, Math.floor(minutes / 60), minutes % 60);
  // Observe what wall clock the naive instant reads in tz, then shift by the
  // difference — correct for any fixed offset (DST shifts are sub-hour noise
  // for this use case and resolved on the next call's recomputation).
  const observed = nowInTzAt(tz, new Date(naive));
  const utcMinutes = new Date(naive).getUTCHours() * 60 + new Date(naive).getUTCMinutes();
  const utcDateStr = new Date(naive).toISOString().slice(0, 10);
  let dayOffset = 0;
  if (observed.dateStr > utcDateStr) dayOffset = 24 * 60;
  else if (observed.dateStr < utcDateStr) dayOffset = -24 * 60;
  const offset = observed.minutes + dayOffset - utcMinutes;
  return new Date(naive - offset * 60_000);
}

/** nowInTz but for an arbitrary instant. */
function nowInTzAt(tz: string, at: Date): { dateStr: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const dateStr = `${get("year")}-${get("month")}-${get("day")}`;
  const hour = Number(get("hour")) % 24;
  return { dateStr, minutes: hour * 60 + Number(get("minute")) };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(`${dateStr}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export type WindowState = {
  open: boolean;
  /** The business date this window belongs to (the day it opened). */
  windowDate: string;
  opensAt: Date | null; // next opening when closed
  closesAt: Date | null; // when open
  closingSoon: boolean; // within 60 minutes of closing
};

export async function getWindowState(): Promise<WindowState> {
  const cfg = await getSettings();
  const { dateStr, minutes } = nowInTz(cfg.timezone);
  const overnight = cfg.windowStartMinutes > cfg.windowEndMinutes;

  let open: boolean;
  let windowDate: string;
  let closesAt: Date | null = null;
  let opensAt: Date | null = null;

  if (overnight) {
    if (minutes >= cfg.windowStartMinutes) {
      open = true;
      windowDate = dateStr;
      closesAt = wallClockToUtc(
        addDays(dateStr, 1),
        cfg.windowEndMinutes,
        cfg.timezone,
      );
    } else if (minutes < cfg.windowEndMinutes) {
      open = true;
      windowDate = addDays(dateStr, -1);
      closesAt = wallClockToUtc(dateStr, cfg.windowEndMinutes, cfg.timezone);
    } else {
      open = false;
      windowDate = addDays(dateStr, 1); // next window opens tonight
      opensAt = wallClockToUtc(
        dateStr,
        cfg.windowStartMinutes,
        cfg.timezone,
      );
    }
  } else {
    if (minutes >= cfg.windowStartMinutes && minutes < cfg.windowEndMinutes) {
      open = true;
      windowDate = dateStr;
      closesAt = wallClockToUtc(dateStr, cfg.windowEndMinutes, cfg.timezone);
    } else if (minutes < cfg.windowStartMinutes) {
      open = false;
      windowDate = dateStr;
      opensAt = wallClockToUtc(dateStr, cfg.windowStartMinutes, cfg.timezone);
    } else {
      open = false;
      windowDate = addDays(dateStr, 1);
      opensAt = wallClockToUtc(
        addDays(dateStr, 1),
        cfg.windowStartMinutes,
        cfg.timezone,
      );
    }
  }

  const closingSoon =
    open && closesAt !== null && closesAt.getTime() - Date.now() < 60 * 60_000;

  return { open, windowDate, opensAt, closesAt, closingSoon };
}
