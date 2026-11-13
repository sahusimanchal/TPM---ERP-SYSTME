"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, Receipt, RotateCcw, TrendingUp } from "lucide-react";
import * as XLSX from "xlsx";
import { calculateSalesBreakdown, getBills, SalesBreakdown } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BillCategory } from "@/lib/types";
import PeriodSelector from "@/components/reports/PeriodSelector";
import { PeriodPreset, readPeriodFromLocation, resolvePeriod, toYMD } from "@/lib/period";

const CATEGORY_META: { key: BillCategory; label: string; color: string; badge: string }[] = [
  { key: "cement", label: "Cement Sales", color: "#16A34A", badge: "bg-emerald-100 text-emerald-800" },
  { key: "rod", label: "Rod / Steel Sales", color: "#D97706", badge: "bg-amber-100 text-amber-800" },
  { key: "daily", label: "Daily / Electrical Sales", color: "#2563EB", badge: "bg-blue-100 text-blue-800" },
];

/** Assign an approved return to a category via its original bill, else via its item type text */
function returnCategory(itemType: string, originalBillCategory?: BillCategory): BillCategory | "unassigned" {
  if (originalBillCategory) return originalBillCategory;
  const t = (itemType || "").toLowerCase();
  if (t.includes("cement")) return "cement";
  if (t.includes("rod") || t.includes("steel") || t.includes("tmt")) return "rod";
  if (t.includes("daily") || t.includes("elect")) return "daily";
  return "unassigned";
}

export default function SalesReportPage() {
  const [ready, setReady] = useState(false);
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [customStart, setCustomStart] = useState(() => toYMD(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(() => toYMD(new Date()));
  const [data, setData] = useState<SalesBreakdown | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<"all" | BillCategory>("all");

  useEffect(() => {
    const p = readPeriodFromLocation("all");
    setPreset(p.preset);
    if (p.customStart) setCustomStart(p.customStart);
    if (p.customEnd) setCustomEnd(p.customEnd);
    setReady(true);
  }, []);

  const period = useMemo(() => resolvePeriod(preset, customStart, customEnd), [preset, customStart, customEnd]);

  useEffect(() => {
    if (!ready) return;
    const load = () => setData(calculateSalesBreakdown({ start: period.start, end: period.end }));
    load();
    window.addEventListener("tpm_data_updated", load);
    return () => window.removeEventListener("tpm_data_updated", load);
  }, [period, ready]);

  const returnsByCategory = useMemo(() => {
    const map: Record<string, number> = { cement: 0, rod: 0, daily: 0, unassigned: 0 };
    if (!data) return map;
    const billCat = new Map(getBills().map((b) => [b.id, b.bill_category] as const));
    for (const r of data.returns) {
      const cat = returnCategory(r.item_type, r.original_bill_id ? billCat.get(r.original_bill_id) : undefined);
      map[cat] += r.amount || 0;
    }
    return map;
  }, [data]);

  const visibleBills = useMemo(() => {
    if (!data) return [];
    return [...data.bills]
      .filter((b) => categoryFilter === "all" || b.bill_category === categoryFilter)
      .sort((a, b) => (b.bill_date || "").localeCompare(a.bill_date || ""));
  }, [data, categoryFilter]);

  const handleExportExcel = () => {
    if (!data) return;
    const summary = [
      ...CATEGORY_META.map((c) => ({
        Category: c.label,
        Bills: data[`${c.key}_count` as "cement_count"],
        "Gross Sales (₹)": data[c.key],
        "Approved Returns (₹)": returnsByCategory[c.key],
        "Net Sales (₹)": data[c.key] - returnsByCategory[c.key],
      })),
      ...(returnsByCategory.unassigned
        ? [{ Category: "Returns not linked to a category", Bills: 0, "Gross Sales (₹)": 0, "Approved Returns (₹)": returnsByCategory.unassigned, "Net Sales (₹)": -returnsByCategory.unassigned }]
        : []),
      {
        Category: "TOTAL",
        Bills: data.bills.length,
        "Gross Sales (₹)": data.gross_sales,
        "Approved Returns (₹)": data.approved_returns,
        "Net Sales (₹)": data.net_sales,
      },
    ];
    const bills = visibleBills.map((b) => ({
      "Bill No": b.bill_number,
      Date: formatDate(b.bill_date),
      Customer: b.customer_name,
      Category: b.bill_category.toUpperCase(),
      "Amount (₹)": b.total_amount,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), "Sales Summary");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(bills), "Bills");
    XLSX.writeFile(wb, `Sales_Report_${period.start || "all"}_${period.end || "records"}.xlsx`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Sales Report</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Posted bills by bill date · <strong className="text-slate-700">{period.label}</strong>
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <PeriodSelector
            preset={preset}
            customStart={customStart}
            customEnd={customEnd}
            onPresetChange={setPreset}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-2xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Excel
          </button>
        </div>
      </div>

      {!data ? (
        <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" />
      ) : (
        <>
          {/* Category cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {CATEGORY_META.map((c) => (
              <div key={c.key} className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs" style={{ borderTop: `4px solid ${c.color}` }}>
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{c.label}</div>
                <div className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(data[c.key])}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {data[`${c.key}_count` as "cement_count"]} bills · Returns −{formatCurrency(returnsByCategory[c.key])}
                </div>
              </div>
            ))}
          </div>

          {/* Gross → Returns → Net */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-sm">Sales Summary</h3>
              <p className="text-xs text-slate-500">Net Sales = Gross Sales − Approved Sales Returns</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs min-w-[520px]">
                <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Bills</th>
                    <th className="py-3 px-4 text-right">Gross Sales</th>
                    <th className="py-3 px-4 text-right">Returns</th>
                    <th className="py-3 px-4 text-right">Net Sales</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {CATEGORY_META.map((c) => (
                    <tr key={c.key}>
                      <td className="py-3 px-4 font-semibold text-slate-900">
                        <span className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle" style={{ backgroundColor: c.color }} />
                        {c.label}
                      </td>
                      <td className="py-3 px-4 text-center">{data[`${c.key}_count` as "cement_count"]}</td>
                      <td className="py-3 px-4 text-right font-semibold">{formatCurrency(data[c.key])}</td>
                      <td className="py-3 px-4 text-right text-rose-600">−{formatCurrency(returnsByCategory[c.key])}</td>
                      <td className="py-3 px-4 text-right font-bold">{formatCurrency(data[c.key] - returnsByCategory[c.key])}</td>
                    </tr>
                  ))}
                  {returnsByCategory.unassigned > 0 && (
                    <tr>
                      <td className="py-3 px-4 text-slate-500 italic">Returns not linked to a category</td>
                      <td className="py-3 px-4 text-center">—</td>
                      <td className="py-3 px-4 text-right">—</td>
                      <td className="py-3 px-4 text-right text-rose-600">−{formatCurrency(returnsByCategory.unassigned)}</td>
                      <td className="py-3 px-4 text-right">−{formatCurrency(returnsByCategory.unassigned)}</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                  <tr>
                    <td className="py-3 px-4 flex items-center gap-1.5"><TrendingUp className="w-4 h-4 text-blue-600" /> Total</td>
                    <td className="py-3 px-4 text-center">{data.bills.length}</td>
                    <td className="py-3 px-4 text-right">{formatCurrency(data.gross_sales)}</td>
                    <td className="py-3 px-4 text-right text-rose-600">−{formatCurrency(data.approved_returns)}</td>
                    <td className="py-3 px-4 text-right text-blue-700 text-sm">{formatCurrency(data.net_sales)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Bills in period */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5"><Receipt className="w-4 h-4 text-blue-600" /> Bills in Period</h3>
                <p className="text-xs text-slate-500">{visibleBills.length} posted bills</p>
              </div>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value as "all" | BillCategory)}
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold"
              >
                <option value="all">All categories</option>
                {CATEGORY_META.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>
            </div>
            {visibleBills.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-medium">No posted bills for this period.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[520px]">
                  <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-3 px-4">Bill No</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Customer</th>
                      <th className="py-3 px-4">Category</th>
                      <th className="py-3 px-4 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {visibleBills.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-bold text-blue-600">{b.bill_number}</td>
                        <td className="py-2.5 px-4 text-slate-500">{formatDate(b.bill_date)}</td>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{b.customer_name}</td>
                        <td className="py-2.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${CATEGORY_META.find((c) => c.key === b.bill_category)?.badge || ""}`}>
                            {b.bill_category}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatCurrency(b.total_amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {data.returns.length > 0 && (
            <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <RotateCcw className="w-3.5 h-3.5" />
              {data.returns.length} approved returns dated within this period are deducted. Pending / rejected returns are excluded.
            </p>
          )}
        </>
      )}
    </div>
  );
}

