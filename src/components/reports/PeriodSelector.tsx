"use client";

import { Calendar } from "lucide-react";
import { PERIOD_OPTIONS, PeriodPreset } from "@/lib/period";

interface PeriodSelectorProps {
  preset: PeriodPreset;
  customStart: string;
  customEnd: string;
  onPresetChange: (p: PeriodPreset) => void;
  onCustomStartChange: (v: string) => void;
  onCustomEndChange: (v: string) => void;
  className?: string;
}

/**
 * Compact reporting-period selector shared by the Dashboard and report pages.
 * Shows start / end date inputs only when "Custom Date Range" is chosen.
 */
export default function PeriodSelector({
  preset,
  customStart,
  customEnd,
  onPresetChange,
  onCustomStartChange,
  onCustomEndChange,
  className = "",
}: PeriodSelectorProps) {
  return (
    <div className={`flex flex-col sm:flex-row items-stretch sm:items-center gap-2 ${className}`}>
      <label className="relative flex items-center flex-1 sm:flex-initial">
        <span className="sr-only">Reporting period</span>
        <Calendar className="w-4 h-4 absolute left-2.5 text-blue-600 pointer-events-none" />
        <select
          value={preset}
          onChange={(e) => onPresetChange(e.target.value as PeriodPreset)}
          className="w-full sm:w-48 pl-8 pr-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-800 shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
        >
          {PERIOD_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {preset === "custom" && (
        <div className="flex items-center gap-2 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs shadow-2xs">
          <input
            type="date"
            value={customStart}
            onChange={(e) => onCustomStartChange(e.target.value)}
            className="bg-transparent text-slate-800 font-medium focus:outline-none text-[11px] sm:text-xs flex-1 min-w-0"
            aria-label="Start date"
          />
          <span className="text-slate-400 font-semibold">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => onCustomEndChange(e.target.value)}
            className="bg-transparent text-slate-800 font-medium focus:outline-none text-[11px] sm:text-xs flex-1 min-w-0"
            aria-label="End date"
          />
        </div>
      )}
    </div>
  );
}

