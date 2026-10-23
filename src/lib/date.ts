// All "which day is this" logic is anchored to Asia/Karachi (Lahore), since
// the server (Vercel) runs in UTC and orders/expenses should bucket by the
// shop's actual calendar day, not UTC's.
const TZ = "Asia/Karachi";

export function todayISO(): string {
  return toISODate(new Date());
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
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return toISODate(d);
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
