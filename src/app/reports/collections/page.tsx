"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileSpreadsheet, Search, CreditCard } from "lucide-react";
import * as XLSX from "xlsx";
import { calculateCollectionsBreakdown, CollectionsBreakdown, CollectionBucket, getCollectionBucket } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/utils";
import PeriodSelector from "@/components/reports/PeriodSelector";
import { PeriodPreset, readPeriodFromLocation, resolvePeriod, toYMD } from "@/lib/period";

const BUCKETS: { key: CollectionBucket; label: string; badge: string }[] = [
  { key: "cash", label: "Cash", badge: "bg-amber-100 text-amber-800" },
  { key: "upi", label: "UPI", badge: "bg-blue-100 text-blue-800" },
  { key: "bank", label: "Bank", badge: "bg-purple-100 text-purple-800" },
  { key: "other", label: "Other", badge: "bg-slate-100 text-slate-700" },
];

export default function CollectionsReportPage() {
  const [ready, setReady] = useState(false);
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [customStart, setCustomStart] = useState(() => toYMD(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(() => toYMD(new Date()));
  const [data, setData] = useState<CollectionsBreakdown | null>(null);
  const [search, setSearch] = useState("");
  const [bucket, setBucket] = useState<"all" | CollectionBucket>("all");

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
    const load = () => setData(calculateCollectionsBreakdown({ start: period.start, end: period.end }));
    load();
    window.addEventListener("tpm_data_updated", load);
    return () => window.removeEventListener("tpm_data_updated", load);
  }, [period, ready]);

  const rows = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return [...data.payments]
      .filter((p) => bucket === "all" || getCollectionBucket(p.payment_mode) === bucket)
      .filter(
        (p) =>
          !q ||
          p.customer_name.toLowerCase().includes(q) ||
          (p.reference_number || "").toLowerCase().includes(q) ||
          (p.receipt_number || "").toLowerCase().includes(q)
      )
      .sort((a, b) => (b.payment_date || "").localeCompare(a.payment_date || ""));
  }, [data, search, bucket]);

  const rowsTotal = rows.reduce((acc, p) => acc + (p.amount || 0), 0);

  const handleExportExcel = () => {
    const sheet: any[] = rows.map((p) => ({
      "Payment Date": formatDate(p.payment_date),
      "Receipt No": p.receipt_number,
      Customer: p.customer_name,
      "Payment Mode": p.payment_mode,
      Reference: p.reference_number || "",
      "Amount Received (₹)": p.amount,
    }));
    sheet.push({ "Payment Date": "", "Receipt No": "", Customer: "TOTAL", "Payment Mode": "—", Reference: "", "Amount Received (₹)": rowsTotal });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), "Collections");
    XLSX.writeFile(wb, `Collections_Report_${period.start || "all"}_${period.end || "records"}.xlsx`);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-emerald-600 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Payment Collection Report</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Receipts by actual payment date · <strong className="text-slate-700">{period.label}</strong>
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
          {/* Mode summary */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="col-span-2 sm:col-span-1 bg-white rounded-xl p-4 border border-slate-200 border-t-4 border-t-emerald-600 shadow-2xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">Total Collections</div>
              <div className="text-xl font-bold text-slate-900 mt-1">{formatCurrency(data.total)}</div>
              <div className="text-[11px] text-slate-500">{data.count} receipts</div>
            </div>
            {BUCKETS.map((b) => (
              <button
                type="button"
                key={b.key}
                onClick={() => setBucket(bucket === b.key ? "all" : b.key)}
                className={`text-left bg-white rounded-xl p-4 border shadow-2xs transition-colors ${
                  bucket === b.key ? "border-emerald-500 ring-2 ring-emerald-500/20" : "border-slate-200 hover:border-emerald-300"
                }`}
              >
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{b.label}</div>
                <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">{formatCurrency(data[b.key])}</div>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-emerald-600" /> Receipts
                </h3>
                <p className="text-xs text-slate-500">
                  Collections are independent of sales — a receipt is reported on its payment date even if it settles an older bill.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer, reference..."
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-medium">No payments received in this period.</div>
            ) : (
              <>
                {/* Mobile cards */}
                <div className="md:hidden divide-y divide-slate-100">
                  {rows.map((p) => {
                    const b = BUCKETS.find((x) => x.key === getCollectionBucket(p.payment_mode));
                    return (
                      <div key={p.id} className="p-3.5 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{p.customer_name}</div>
                          <div className="text-[11px] text-slate-500">
                            {formatDate(p.payment_date)} · {p.reference_number || p.receipt_number}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-sm font-bold text-emerald-700">{formatCurrency(p.amount)}</div>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${b?.badge}`}>{p.payment_mode}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-3 px-4">Payment Date</th>
                        <th className="py-3 px-4">Receipt No</th>
                        <th className="py-3 px-4">Customer Name</th>
                        <th className="py-3 px-4">Payment Mode</th>
                        <th className="py-3 px-4">Reference Number</th>
                        <th className="py-3 px-4 text-right">Amount Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {rows.map((p) => {
                        const b = BUCKETS.find((x) => x.key === getCollectionBucket(p.payment_mode));
                        return (
                          <tr key={p.id} className="hover:bg-slate-50/70">
                            <td className="py-2.5 px-4 text-slate-500">{formatDate(p.payment_date)}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">{p.receipt_number}</td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900">{p.customer_name}</td>
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${b?.badge}`}>{p.payment_mode}</span>
                            </td>
                            <td className="py-2.5 px-4 font-mono text-slate-500">{p.reference_number || "—"}</td>
                            <td className="py-2.5 px-4 text-right font-bold text-emerald-700">{formatCurrency(p.amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between px-4 sm:px-5 py-3 bg-slate-50 border-t-2 border-slate-200 text-sm font-bold text-slate-900">
                  <span>Total Collections ({rows.length})</span>
                  <span className="text-emerald-700">{formatCurrency(rowsTotal)}</span>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

