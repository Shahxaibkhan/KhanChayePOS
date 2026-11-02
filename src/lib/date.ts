// All "which day is this" logic is anchored to Asia/Karachi (Lahore), since
// the server (Vercel) runs in UTC and orders/expenses should bucket by the
// shop's business day, not UTC's.
//
// The shop runs ~12 noon to ~4 AM, so a business day doesn't end at midnight:
// it runs from BUSINESS_DAY_START_HOUR to the same hour the next morning.
// An order at 1 AM on the 3rd belongs to the 2nd's business day.
const TZ = "Asia/Karachi";
export const BUSINESS_DAY_START_HOUR = 6; // 6 AM — safely after closing, before opening
const BUSINESS_DAY_SHIFT_MS = BUSINESS_DAY_START_HOUR * 60 * 60 * 1000;

/** Today's business day (YYYY-MM-DD) — still "yesterday" until 6 AM. */
export function todayISO(): string {
  return toISODate(new Date(Date.now() - BUSINESS_DAY_SHIFT_MS));
}

export function toISODate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date); // en-CA formats as YYYY-MM-DD
}

export function daysAgoISO(days: number): string {
  const d = new Date(Date.now() - BUSINESS_DAY_SHIFT_MS);
  d.setUTCDate(d.getUTCDate() - days);
  return toISODate(d);
}

// Pakistan Standard Time is a fixed UTC+5 year-round (no DST), so this is
// safe to hardcode rather than deriving it from the TZ name each time.
const KARACHI_OFFSET_HOURS = 5;

/**
 * Converts a business day (YYYY-MM-DD) into the UTC instant it begins:
 * BUSINESS_DAY_START_HOUR on that date, Karachi time. Use this (not a bare
 * `${date}T00:00:00` string) when filtering a timestamptz column like
 * orders.created_at — Postgres reads a naive timestamp string as UTC.
 */
export function karachiDayStartUTC(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  d.setUTCHours(d.getUTCHours() - KARACHI_OFFSET_HOURS + BUSINESS_DAY_START_HOUR);
  return d.toISOString();
}

/** The UTC instant 1ms before the next business day begins — see karachiDayStartUTC. */
export function karachiDayEndUTC(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(d.getUTCHours() - KARACHI_OFFSET_HOURS + BUSINESS_DAY_START_HOUR);
  d.setUTCMilliseconds(d.getUTCMilliseconds() - 1);
  return d.toISOString();
}

export function formatMoney(n: number): string {
  return `Rs ${n.toLocaleString("en-PK", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-PK", {
    timeZone: TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(iso.includes("T") ? iso : `${iso}T12:00:00Z`));
}
