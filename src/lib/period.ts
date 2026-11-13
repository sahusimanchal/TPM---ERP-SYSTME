/**
 * Shared reporting-period helpers used by the Dashboard and the
 * Sales / Collections / Customer Outstanding reports.
 *
 * All dates are local calendar dates (YYYY-MM-DD), matching how bill_date,
 * payment_date and return_date are stored.
 */

export type PeriodPreset =
  | "today"
  | "yesterday"
  | "this_week"
  | "this_month"
  | "previous_month"
  | "oct_2026"
  | "all"
  | "custom";

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this_week", label: "This Week" },
  { value: "this_month", label: "This Month" },
  { value: "previous_month", label: "Previous Month" },
  { value: "oct_2026", label: "OCT 2026 (Historical)" },
  { value: "all", label: "All Records" },
  { value: "custom", label: "Custom Date Range" },
];

export interface DateRange {
  start?: string;
  end?: string;
}

export interface ReportingPeriod extends DateRange {
  preset: PeriodPreset;
  /** Human readable period label, e.g. "This Month (01-11-2026 to 30-11-2026)" */
  label: string;
  /** Short label used inside card titles */
  shortLabel: string;
  /** Outstanding balances are computed as of this date (undefined = all records) */
  asOfDate?: string;
  asOfLabel: string;
}

export function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** DD-MM-YYYY display without timezone shifting */
export function ymdToDisplay(ymd?: string): string {
  if (!ymd) return "—";
  const [y, m, d] = ymd.split("-");
  if (!y || !m || !d) return ymd;
  return `${d}-${m}-${y}`;
}

export function resolvePeriod(
  preset: PeriodPreset,
  customStart?: string,
  customEnd?: string,
  now: Date = new Date()
): ReportingPeriod {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let start: string | undefined;
  let end: string | undefined;
  let name = PERIOD_OPTIONS.find((o) => o.value === preset)?.label || "All Records";

  switch (preset) {
    case "today":
      start = end = toYMD(today);
      break;
    case "yesterday": {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      start = end = toYMD(y);
      break;
    }
    case "this_week": {
      // Indian business week: Monday → Sunday
      const dow = (today.getDay() + 6) % 7; // Monday = 0
      const mon = new Date(today);
      mon.setDate(mon.getDate() - dow);
      const sun = new Date(mon);
      sun.setDate(sun.getDate() + 6);
      start = toYMD(mon);
      end = toYMD(sun);
      break;
    }
    case "this_month":
      start = toYMD(new Date(today.getFullYear(), today.getMonth(), 1));
      end = toYMD(new Date(today.getFullYear(), today.getMonth() + 1, 0));
      break;
    case "previous_month":
      start = toYMD(new Date(today.getFullYear(), today.getMonth() - 1, 1));
      end = toYMD(new Date(today.getFullYear(), today.getMonth(), 0));
      break;
    case "oct_2026":
      start = "2026-10-01";
      end = "2026-10-31";
      name = "OCT 2026";
      break;
    case "custom":
      start = customStart || undefined;
      end = customEnd || undefined;
      if (start && end && start > end) {
        [start, end] = [end, start];
      }
      name = "Custom";
      break;
    case "all":
    default:
      start = end = undefined;
      name = "All Records";
  }

  const rangeText =
    start && end
      ? start === end
        ? ymdToDisplay(start)
        : `${ymdToDisplay(start)} to ${ymdToDisplay(end)}`
      : start
      ? `from ${ymdToDisplay(start)}`
      : end
      ? `up to ${ymdToDisplay(end)}`
      : "";

  const label = rangeText ? `${name} (${rangeText})` : name;
  const shortLabel = preset === "custom" ? rangeText || "Custom" : name;

  // Outstanding is a point-in-time balance: as of the period's end date.
  const asOfDate = end;
  const asOfLabel = asOfDate ? `As of ${ymdToDisplay(asOfDate)}` : "As of today (all records)";

  return { preset, start, end, label, shortLabel, asOfDate, asOfLabel };
}

/** Inclusive date-range check. No range = include everything (even undated rows). */
export function isDateInRange(date: string | null | undefined, range?: DateRange): boolean {
  if (!range || (!range.start && !range.end)) return true;
  if (!date) return false;
  if (range.start && date < range.start) return false;
  if (range.end && date > range.end) return false;
  return true;
}

/** Build a query string carrying the selected period to report pages */
export function periodToQuery(preset: PeriodPreset, customStart?: string, customEnd?: string): string {
  const p = new URLSearchParams();
  p.set("period", preset);
  if (preset === "custom") {
    if (customStart) p.set("from", customStart);
    if (customEnd) p.set("to", customEnd);
  }
  return `?${p.toString()}`;
}

export function readPeriodFromLocation(fallback: PeriodPreset = "all"): {
  preset: PeriodPreset;
  customStart: string;
  customEnd: string;
} {
  if (typeof window === "undefined") return { preset: fallback, customStart: "", customEnd: "" };
  const params = new URLSearchParams(window.location.search);
  const raw = params.get("period") as PeriodPreset | null;
  const preset = raw && PERIOD_OPTIONS.some((o) => o.value === raw) ? raw : fallback;
  return {
    preset,
    customStart: params.get("from") || "",
    customEnd: params.get("to") || "",
  };
}

