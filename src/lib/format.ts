const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function inr(v: number): string {
  return "₹" + Math.round(v).toLocaleString("en-IN");
}

/** Lakh / crore shorthand, the way the amounts are actually spoken. */
export function lakh(v: number): string {
  const a = Math.abs(v);
  if (a >= 1e7) return "₹" + strip((v / 1e7).toFixed(2)) + "Cr";
  if (a >= 1e5) return "₹" + strip((v / 1e5).toFixed(2)) + "L";
  if (a >= 1000) return "₹" + Math.round(v / 1000) + "K";
  return "₹" + Math.round(v);
}
const strip = (s: string) => s.replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");

export function pct(v: number): string {
  return strip((v * 100).toFixed(2)) + "%";
}

export function monthLabel(index: number, startYear: number, startMonth1: number, long = false): string {
  const t = startMonth1 - 1 + index;
  const y = startYear + Math.floor(t / 12);
  const m = ((t % 12) + 12) % 12;
  return MONTHS[m] + " " + (long ? y : String(y).slice(2));
}

/** Which month index "today" falls on, clamped into the plan window. */
export function currentIndex(startYear: number, startMonth1: number, horizon: number, now = new Date()): number {
  const raw = (now.getFullYear() - startYear) * 12 + (now.getMonth() - (startMonth1 - 1));
  return Math.max(0, Math.min(horizon - 1, raw));
}
