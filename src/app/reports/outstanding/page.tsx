"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Eye, FileSpreadsheet, Loader2, Search, Users } from "lucide-react";
import * as XLSX from "xlsx";
import {
  calculateCustomerOutstanding,
  CustomerOutstandingRow,
  CustomerPaymentStatus,
  OutstandingSummary,
} from "@/lib/storage";
import { formatCurrency } from "@/lib/utils";
import { BillCategory } from "@/lib/types";
import PeriodSelector from "@/components/reports/PeriodSelector";
import { PeriodPreset, readPeriodFromLocation, resolvePeriod, toYMD, ymdToDisplay } from "@/lib/period";
import { exportElementToPdf } from "@/lib/pdfExport";

type StatusFilter = "active" | "unpaid" | "partially_paid" | "paid" | "advance" | "everyone";
type SortKey = "outstanding" | "advance" | "bills" | "name";

const STATUS_META: Record<CustomerPaymentStatus, { label: string; badge: string }> = {
  unpaid: { label: "Unpaid", badge: "bg-rose-50 text-rose-700 border-rose-200" },
  partially_paid: { label: "Partially Paid", badge: "bg-amber-50 text-amber-700 border-amber-200" },
  paid: { label: "Paid / Cleared", badge: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  advance: { label: "Advance", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  no_activity: { label: "No Activity", badge: "bg-slate-50 text-slate-500 border-slate-200" },
};

export default function OutstandingReportPage() {
  const [ready, setReady] = useState(false);
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [customStart, setCustomStart] = useState(() => toYMD(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [customEnd, setCustomEnd] = useState(() => toYMD(new Date()));
  const [data, setData] = useState<OutstandingSummary | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"all" | BillCategory>("all");
  const [status, setStatus] = useState<StatusFilter>("active");
  const [sortKey, setSortKey] = useState<SortKey>("outstanding");
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

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
    const load = () => setData(calculateCustomerOutstanding(period.asOfDate));
    load();
    window.addEventListener("tpm_data_updated", load);
    return () => window.removeEventListener("tpm_data_updated", load);
  }, [period, ready]);

  const rows = useMemo<CustomerOutstandingRow[]>(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    const list = data.rows.filter((r) => {
      if (status === "active" && r.status === "no_activity") return false;
      if (status !== "active" && status !== "everyone" && r.status !== status) return false;
      if (category !== "all" && !r.categories.includes(category)) return false;
      if (q && !r.customer_name.toLowerCase().includes(q) && !(r.phone || "").includes(q) && !(r.code || "").toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
    const sorted = [...list];
    switch (sortKey) {
      case "advance":
        sorted.sort((a, b) => b.advance - a.advance);
        break;
      case "bills":
        sorted.sort((a, b) => b.total_bills - a.total_bills);
        break;
      case "name":
        sorted.sort((a, b) => a.customer_name.localeCompare(b.customer_name));
        break;
      default:
        sorted.sort((a, b) => b.outstanding - a.outstanding || b.advance - a.advance);
    }
    return sorted;
  }, [data, search, category, status, sortKey]);

  const totals = useMemo(
    () =>
      rows.reduce(
        (acc, r) => ({
          opening: acc.opening + r.opening_balance,
          bills: acc.bills + r.total_bills,
          returns: acc.returns + r.approved_returns,
          allocated: acc.allocated + r.payments_allocated,
          unallocated: acc.unallocated + r.unallocated_credits,
          outstanding: acc.outstanding + r.outstanding,
          advance: acc.advance + r.advance,
        }),
        { opening: 0, bills: 0, returns: 0, allocated: 0, unallocated: 0, outstanding: 0, advance: 0 }
      ),
    [rows]
  );

  const fileSuffix = period.asOfDate || toYMD(new Date());

  const handleExportExcel = () => {
    const sheet = rows.map((r) => ({
      "Customer Name": r.customer_name,
      Code: r.code || "",
      Phone: r.phone || "",
      "Opening Balance (₹)": r.opening_balance,
      "Total Bills (₹)": r.total_bills,
      "Approved Returns (₹)": r.approved_returns,
      "Payments Allocated (₹)": r.payments_allocated,
      "Unallocated Credits (₹)": r.unallocated_credits,
      "Customer Outstanding (₹)": r.outstanding,
      "Customer Advance (₹)": r.advance,
      Status: STATUS_META[r.status].label,
      "Unpaid Bills": r.unpaid_bills,
      "Partially Paid Bills": r.partially_paid_bills,
    }));
    sheet.push({
      "Customer Name": "TOTAL",
      Code: "",
      Phone: "",
      "Opening Balance (₹)": totals.opening,
      "Total Bills (₹)": totals.bills,
      "Approved Returns (₹)": totals.returns,
      "Payments Allocated (₹)": totals.allocated,
      "Unallocated Credits (₹)": totals.unallocated,
      "Customer Outstanding (₹)": totals.outstanding,
      "Customer Advance (₹)": totals.advance,
      Status: "",
      "Unpaid Bills": rows.reduce((a, r) => a + r.unpaid_bills, 0),
      "Partially Paid Bills": rows.reduce((a, r) => a + r.partially_paid_bills, 0),
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet), "Customer Outstanding");
    XLSX.writeFile(wb, `Customer_Outstanding_${fileSuffix}.xlsx`);
  };

  const handleExportPdf = async () => {
    setIsGeneratingPDF(true);
    try {
      await exportElementToPdf({
        elementId: "outstanding-report-doc",
        filename: `Customer_Outstanding_${fileSuffix}.pdf`,
        widthPx: 1040,
        orientation: "landscape",
      });
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <Link href="/" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-orange-600 mb-1">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Customer Outstanding Report</h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Balances <strong className="text-slate-700">{period.asOfLabel.toLowerCase()}</strong> — includes all history up to that date
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold shadow-2xs"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Excel
            </button>
            <button
              type="button"
              onClick={handleExportPdf}
              disabled={isGeneratingPDF}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold shadow-2xs disabled:opacity-60"
            >
              {isGeneratingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />} PDF
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative col-span-2 lg:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search customer, phone, code..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value as "all" | BillCategory)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold">
          <option value="all">All categories</option>
          <option value="cement">Cement buyers</option>
          <option value="rod">Rod / Steel buyers</option>
          <option value="daily">Daily / Electrical buyers</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold">
          <option value="active">All with activity</option>
          <option value="unpaid">Unpaid</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid / Cleared</option>
          <option value="advance">Advance / Credit</option>
          <option value="everyone">All customers (incl. no activity)</option>
        </select>
        <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="col-span-2 lg:col-span-1 px-3 py-2 rounded-lg border border-slate-200 bg-white text-xs font-semibold">
          <option value="outstanding">Sort: Highest outstanding</option>
          <option value="advance">Sort: Highest advance</option>
          <option value="bills">Sort: Highest billing</option>
          <option value="name">Sort: Name A–Z</option>
        </select>
      </div>

      {!data ? (
        <div className="h-40 bg-white rounded-xl border border-slate-200 animate-pulse" />
      ) : (
        <div id="outstanding-report-doc" className="space-y-4 bg-transparent">
          {/* PDF-only letterhead (hidden on screen) */}
          <div data-pdf-show className="hidden pb-3 border-b-2 border-slate-900">
            <div className="text-lg font-black uppercase text-slate-950">The Pramod Maharaj Enterprises</div>
            <div className="text-xs font-bold text-slate-700">
              Customer Outstanding Report · Balance as of {period.asOfDate ? ymdToDisplay(period.asOfDate) : `${ymdToDisplay(toYMD(new Date()))} (all records)`}
            </div>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="col-span-2 lg:col-span-1 bg-white rounded-xl p-4 border border-slate-200 border-t-4 border-t-orange-500 shadow-2xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-orange-700">Total Outstanding</div>
              <div className="text-xl font-bold text-rose-600 mt-1">{formatCurrency(data.total_outstanding)}</div>
              <div className="text-[11px] text-slate-500">{data.customers_with_dues} customers with dues</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Unpaid Bill Amount</div>
              <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">{formatCurrency(data.total_unpaid_amount)}</div>
              <div className="text-[11px] text-slate-500">Open after allocations & returns</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Unpaid / Partial Bills</div>
              <div className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                {data.unpaid_bills_count} / {data.partially_paid_bills_count}
              </div>
              <div className="text-[11px] text-slate-500">{data.paid_bills_count} bills fully settled</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Unallocated Credits</div>
              <div className="text-base sm:text-lg font-bold text-emerald-700 mt-1">{formatCurrency(data.total_unallocated_credits)}</div>
              <div className="text-[11px] text-slate-500">Receipts not allocated to bills</div>
            </div>
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-2xs">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Customer Advances</div>
              <div className="text-base sm:text-lg font-bold text-blue-700 mt-1">{formatCurrency(data.total_advances)}</div>
              <div className="text-[11px] text-slate-500">Negative balances (credit)</div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" />
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Customer Balances ({rows.length})</h3>
                <p className="text-[11px] text-slate-500">
                  Outstanding = Opening + Bills − Approved Returns − Payments Allocated − Unallocated Credits
                </p>
              </div>
            </div>

            {rows.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 font-medium">No customers match the selected filters.</div>
            ) : (
              <>
                {/* Mobile cards */}
                <div data-pdf-hide className="md:hidden divide-y divide-slate-100">
                  {rows.map((r) => (
                    <div key={r.customer_id} className="p-3.5 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">{r.customer_name}</div>
                          <span className={`inline-block mt-0.5 px-1.5 py-0.5 rounded border text-[10px] font-bold ${STATUS_META[r.status].badge}`}>
                            {STATUS_META[r.status].label}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          {r.advance > 0 ? (
                            <>
                              <div className="text-sm font-bold text-blue-700">{formatCurrency(r.advance)}</div>
                              <div className="text-[10px] text-slate-500">Advance</div>
                            </>
                          ) : (
                            <>
                              <div className="text-sm font-bold text-rose-600">{formatCurrency(r.outstanding)}</div>
                              <div className="text-[10px] text-slate-500">Outstanding</div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                        <span>Opening: <b className="text-slate-700">{formatCurrency(r.opening_balance)}</b></span>
                        <span>Bills: <b className="text-slate-700">{formatCurrency(r.total_bills)}</b></span>
                        <span>Returns: <b className="text-slate-700">{formatCurrency(r.approved_returns)}</b></span>
                        <span>Allocated: <b className="text-slate-700">{formatCurrency(r.payments_allocated)}</b></span>
                        <span>Unallocated: <b className="text-slate-700">{formatCurrency(r.unallocated_credits)}</b></span>
                        {r.is_linked && (
                          <Link href={`/customers?ledger=${encodeURIComponent(r.customer_id)}`} className="font-bold text-blue-600">
                            View ledger →
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop table */}
                <div data-pdf-show className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-3 px-3">Customer Name</th>
                        <th className="py-3 px-3 text-right">Opening Bal.</th>
                        <th className="py-3 px-3 text-right">Total Bills</th>
                        <th className="py-3 px-3 text-right">Approved Returns</th>
                        <th className="py-3 px-3 text-right">Payments Allocated</th>
                        <th className="py-3 px-3 text-right">Unallocated Credits</th>
                        <th className="py-3 px-3 text-right">Customer Outstanding</th>
                        <th className="py-3 px-3 text-right">Customer Advance</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th data-pdf-hide className="py-3 px-3 text-center">Ledger</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {rows.map((r) => (
                        <tr key={r.customer_id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900">{r.customer_name}</div>
                            <div className="text-[10px] text-slate-400">
                              {r.code || (r.is_linked ? "" : "Not in customer master")} {r.bill_count > 0 && `· ${r.bill_count} bills (${r.unpaid_bills} unpaid, ${r.partially_paid_bills} partial)`}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right">{formatCurrency(r.opening_balance)}</td>
                          <td className="py-2.5 px-3 text-right font-semibold">{formatCurrency(r.total_bills)}</td>
                          <td className="py-2.5 px-3 text-right text-rose-600">{formatCurrency(r.approved_returns)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-700">{formatCurrency(r.payments_allocated)}</td>
                          <td className="py-2.5 px-3 text-right text-emerald-700">{formatCurrency(r.unallocated_credits)}</td>
                          <td className="py-2.5 px-3 text-right font-black text-rose-600">{r.outstanding > 0 ? formatCurrency(r.outstanding) : "—"}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-blue-700">{r.advance > 0 ? formatCurrency(r.advance) : "—"}</td>
                          <td className="py-2.5 px-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-bold whitespace-nowrap ${STATUS_META[r.status].badge}`}>
                              {STATUS_META[r.status].label}
                            </span>
                          </td>
                          <td data-pdf-hide className="py-2.5 px-3 text-center">
                            {r.is_linked ? (
                              <Link
                                href={`/customers?ledger=${encodeURIComponent(r.customer_id)}`}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-bold hover:bg-blue-100"
                              >
                                <Eye className="w-3.5 h-3.5" /> Ledger
                              </Link>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-slate-900">
                      <tr>
                        <td className="py-3 px-3">TOTAL</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(totals.opening)}</td>
                        <td className="py-3 px-3 text-right">{formatCurrency(totals.bills)}</td>
                        <td className="py-3 px-3 text-right text-rose-600">{formatCurrency(totals.returns)}</td>
                        <td className="py-3 px-3 text-right text-emerald-700">{formatCurrency(totals.allocated)}</td>
                        <td className="py-3 px-3 text-right text-emerald-700">{formatCurrency(totals.unallocated)}</td>
                        <td className="py-3 px-3 text-right text-rose-600">{formatCurrency(totals.outstanding)}</td>
                        <td className="py-3 px-3 text-right text-blue-700">{formatCurrency(totals.advance)}</td>
                        <td className="py-3 px-3" />
                        <td data-pdf-hide className="py-3 px-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile totals */}
                <div data-pdf-hide className="md:hidden flex items-center justify-between px-4 py-3 bg-slate-50 border-t-2 border-slate-200 text-sm font-bold">
                  <span>Total Outstanding</span>
                  <span className="text-rose-600">{formatCurrency(totals.outstanding)}</span>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

