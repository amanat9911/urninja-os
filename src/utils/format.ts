// Formatting aur date-range helpers — currency, dates aur "today/yesterday/weekly" filters yahin se bante hain.
import { format, parseISO, subDays, startOfMonth, startOfYear, isWithinInterval } from "date-fns";

export const inr = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
export const fmtDate = (s?: string) => (s ? format(parseISO(s), "dd MMM yyyy") : "—");
export const today = () => format(new Date(), "yyyy-MM-dd");

export type RangeKey = "today" | "yesterday" | "dby" | "week" | "month" | "year" | "custom";
export const RANGE_LABELS: Record<RangeKey, string> = {
  today: "Today", yesterday: "Yesterday", dby: "Day before yesterday", week: "This week", month: "This month", year: "This year", custom: "Custom",
};

// Ye function selected range ko [from, to] dates mein badalta hai — saare reports isi se filter hote hain
export function rangeBounds(key: RangeKey, custom?: { from: string; to: string }): [Date, Date] {
  const now = new Date();
  const day = (n: number) => {
    const x = subDays(now, n);
    return [new Date(x.setHours(0, 0, 0, 0)), new Date(new Date(subDays(now, n)).setHours(23, 59, 59, 999))] as [Date, Date];
  };
  switch (key) {
    case "today": return day(0);
    case "yesterday": return day(1);
    case "dby": return day(2);
    case "week": return [subDays(now, 6), now];
    case "month": return [startOfMonth(now), now];
    case "year": return [startOfYear(now), now];
    case "custom":
      return custom ? [parseISO(custom.from), new Date(parseISO(custom.to).setHours(23, 59, 59))] : day(0);
  }
}

export function inRange(dateStr: string | undefined, bounds: [Date, Date]) {
  if (!dateStr) return false;
  return isWithinInterval(parseISO(dateStr), { start: bounds[0], end: bounds[1] });
}

export const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
