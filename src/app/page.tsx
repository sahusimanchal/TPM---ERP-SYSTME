"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  ArrowUpRight, 
  CreditCard, 
  Wallet, 
  AlertCircle, 
  PlusCircle,
  Receipt,
  Package,
  Hammer,
  Zap,
  RotateCcw,
  BarChart3,
  Users,
  ChevronRight,
  PieChart as PieChartIcon
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  calculateDashboardMetrics,
  calculateSalesBreakdown,
  calculateCollectionsBreakdown,
  calculateCustomerOutstanding,
  SalesBreakdown,
  CollectionsBreakdown,
  OutstandingSummary,
} from "@/lib/storage";
import { Bill, DashboardMetrics } from "@/lib/types";
import { PeriodPreset, resolvePeriod, periodToQuery, toYMD } from "@/lib/period";
import PeriodSelector from "@/components/reports/PeriodSelector";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  CartesianGrid
} from "recharts";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [sales, setSales] = useState<SalesBreakdown | null>(null);
  const [collections, setCollections] = useState<CollectionsBreakdown | null>(null);
  const [outstanding, setOutstanding] = useState<OutstandingSummary | null>(null);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);

  // Reporting period (shared by every dashboard section and passed on to the reports)
  const [preset, setPreset] = useState<PeriodPreset>("all");
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    return toYMD(new Date(d.getFullYear(), d.getMonth(), 1));
  });
  const [customEnd, setCustomEnd] = useState(() => toYMD(new Date()));

  const period = useMemo(() => resolvePeriod(preset, customStart, customEnd), [preset, customStart, customEnd]);
  const reportQuery = periodToQuery(preset, customStart, customEnd);
  const periodLabel = period.shortLabel;

  const [categoryData, setCategoryData] = useState<{ name: string; value: number; color: string }[]>([]);
  const [trendData, setTrendData] = useState<{ day: string; sales: number; collections: number }[]>([]);
  const [hasTrendActivity, setHasTrendActivity] = useState(false);

  useEffect(() => {
    const loadData = () => {
      const dateFilter = period.start || period.end ? { start: period.start, end: period.end } : undefined;

      const m = calculateDashboardMetrics(dateFilter);
      setMetrics(m);

      // Sales → bill date, Collections → payment date, Outstanding → as of period end date
      const s = calculateSalesBreakdown(dateFilter);
      const c = calculateCollectionsBreakdown(dateFilter);
      setSales(s);
      setCollections(c);
      setOutstanding(calculateCustomerOutstanding(period.asOfDate));

      const filteredBills = s.bills;

      // Sort filtered bills newest first so Recent Invoices strictly reflects the selected period
      const sortedFilteredBills = [...filteredBills].sort((a, b) => {
        const dateCmp = (b.bill_date || "").localeCompare(a.bill_date || "");
        if (dateCmp !== 0) return dateCmp;
        return (b.created_at || "").localeCompare(a.created_at || "");
      });
      setRecentBills(sortedFilteredBills.slice(0, 8));

      // Category Breakdown (same figures as the Total Sales card)
      setCategoryData([
        { name: "Daily / Electrical", value: s.daily, color: "#2563EB" },
        { name: "Cement Sales", value: s.cement, color: "#16A34A" },
        { name: "Rod & Steel", value: s.rod, color: "#D97706" },
      ]);

      // Sales vs Collections Trend (strictly filtered by active reporting period)
      const filteredPayments = c.payments;

      const totalPeriodSales = s.gross_sales;
      const totalPeriodCollections = c.total;

      if (filteredBills.length === 0 && filteredPayments.length === 0) {
        setHasTrendActivity(false);
        setTrendData([]);
      } else if (totalPeriodSales === 0 && totalPeriodCollections === 0) {
        setHasTrendActivity(false);
        setTrendData([]);
      } else {
        setHasTrendActivity(true);

        // Collect all unique dates present in filtered bills and payments
        const dateSet = new Set<string>();
        filteredBills.forEach((b) => {
          if (b.bill_date) dateSet.add(b.bill_date);
        });
        filteredPayments.forEach((p) => {
          if (p.payment_date) dateSet.add(p.payment_date);
        });

        let sortedDates = Array.from(dateSet).sort();

        // If only 1 date has transactions, prepend the prior calendar day with 0 values so AreaChart renders a clean area slope
        if (sortedDates.length === 1) {
          const singleDate = new Date(sortedDates[0] + "T00:00:00");
          if (!isNaN(singleDate.getTime())) {
            const prevDate = new Date(singleDate);
            prevDate.setDate(prevDate.getDate() - 1);
            sortedDates = [toYMD(prevDate), sortedDates[0]];
          }
        }

        // Cap to latest 14 active dates if many dates exist so mobile X-axis labels stay readable
        if (sortedDates.length > 14) {
          sortedDates = sortedDates.slice(sortedDates.length - 14);
        }

        const computedTrend = sortedDates.map((dateStr) => {
          const daySales = filteredBills
            .filter((b) => b.bill_date === dateStr)
            .reduce((acc, b) => acc + (b.total_amount || 0), 0);
          const dayCollections = filteredPayments
            .filter((p) => p.payment_date === dateStr)
            .reduce((acc, p) => acc + (p.amount || 0), 0);

          const parts = dateStr.split("-");
          const shortLabel = parts.length === 3 ? `${parts[2]}-${parts[1]}` : dateStr;

          return {
            day: shortLabel,
            sales: daySales,
            collections: dayCollections,
          };
        });

        setTrendData(computedTrend);
      }
    };

    loadData();
    window.addEventListener("tpm_data_updated", loadData);
    return () => window.removeEventListener("tpm_data_updated", loadData);
  }, [period]);

  if (!metrics || !sales || !collections || !outstanding) {
    return (
      <div className="space-y-5 animate-pulse">
        <div className="h-12 bg-slate-200/70 rounded-xl w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className={`h-44 bg-white rounded-xl border border-slate-200 p-4 ${n === 3 ? "col-span-2 lg:col-span-1" : ""}`} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-64 bg-white rounded-xl border border-slate-200" />
          <div className="h-64 bg-white rounded-xl border border-slate-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4 pb-2 sm:pb-3 border-b border-slate-200">
        {/* Desktop & Tablet Heading (Mobile displays title in the 2-row Mobile Header) */}
        <div className="hidden md:block">
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Financial & Operations Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Real-time accounting status, sales categories, collections & customer balances
          </p>
        </div>

        {/* Reporting Period Controls & Create Bill CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3">
          <PeriodSelector
            preset={preset}
            customStart={customStart}
            customEnd={customEnd}
            onPresetChange={setPreset}
            onCustomStartChange={setCustomStart}
            onCustomEndChange={setCustomEnd}
          />

          <Link
            href="/sales/new"
            className="flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold shadow-2xs transition-colors shrink-0"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>Create Bill</span>
          </Link>
        </div>
      </div>

      {/* Active reporting period + outstanding as-of date */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 -mt-1 sm:-mt-2 text-[11px] sm:text-xs text-slate-500">
        <span>
          Reporting period: <strong className="text-slate-800">{period.label}</strong>
        </span>
        <span>
          Outstanding: <strong className="text-slate-800">{period.asOfLabel}</strong>
        </span>
      </div>

      {/* Data Quality & Unverified Queue Banner */}
      {(metrics.unverified_returns_count > 0 || metrics.data_quality_issues_count > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-amber-900">
                Action Required: Data Quality & Unverified Records Queue
              </div>
              <div className="text-[11px] sm:text-xs text-amber-700">
                {metrics.unverified_returns_count} legacy sales returns require verification. 
                Accounting rules prohibit reducing net sales until approved.
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Link
              href="/returns"
              className="text-xs font-bold text-amber-800 bg-amber-200/80 hover:bg-amber-200 px-3 py-1.5 rounded-md transition-colors"
            >
              Review Returns ({metrics.unverified_returns_count})
            </Link>
            <Link
              href="/cash-flow"
              className="text-xs font-bold text-amber-800 bg-amber-200/80 hover:bg-amber-200 px-3 py-1.5 rounded-md transition-colors"
            >
              Categorize Cash Outflows
            </Link>
          </div>
        </div>
      )}

      {/* Primary Financial KPI Cards: Sales | Collections | Customer Outstanding */}
      <div className="grid grid-cols-2 max-[340px]:grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
        {/* CARD 1: TOTAL SALES (blue) — filtered by bill date */}
        <Link
          href={`/reports/sales${reportQuery}`}
          className="group bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200 border-t-4 border-t-blue-600 shadow-2xs hover:shadow-sm hover:border-blue-300 transition-all flex flex-col justify-between h-full"
        >
          <div>
            <div className="flex items-start justify-between gap-1.5 mb-1.5 sm:mb-2">
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-blue-700 leading-tight">
                  Total Sales
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                  Gross sales · by bill date
                </div>
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-blue-50 text-blue-600 shrink-0">
                <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight break-words">
              {formatCurrency(sales.gross_sales)}
            </div>

            <dl className="mt-2.5 pt-2 border-t border-slate-100 space-y-1 text-[11px] sm:text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Bills posted</dt>
                <dd className="font-semibold text-slate-800">{sales.bills.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Approved returns</dt>
                <dd className="font-semibold text-rose-600 whitespace-nowrap">−{formatCurrency(sales.approved_returns)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-dashed border-slate-200">
                <dt className="font-bold text-slate-700">Net sales</dt>
                <dd className="font-bold text-blue-700 whitespace-nowrap">{formatCurrency(sales.net_sales)}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-2.5 flex items-center gap-0.5 text-[11px] font-bold text-blue-600 group-hover:text-blue-800">
            <span>Sales report</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* CARD 2: TOTAL COLLECTIONS (green) — filtered by payment date */}
        <Link
          href={`/reports/collections${reportQuery}`}
          className="group bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200 border-t-4 border-t-emerald-600 shadow-2xs hover:shadow-sm hover:border-emerald-300 transition-all flex flex-col justify-between h-full"
        >
          <div>
            <div className="flex items-start justify-between gap-1.5 mb-1.5 sm:mb-2">
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-emerald-700 leading-tight">
                  Total Collections
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                  {collections.count} receipts · by payment date
                </div>
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-emerald-50 text-emerald-600 shrink-0">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-bold text-slate-900 tracking-tight break-words">
              {formatCurrency(collections.total)}
            </div>

            <dl className="mt-2.5 pt-2 border-t border-slate-100 space-y-1 text-[11px] sm:text-xs">
              {([
                ["Cash", collections.cash],
                ["UPI", collections.upi],
                ["Bank", collections.bank],
                ["Other modes", collections.other],
              ] as [string, number][]).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(value)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="mt-2.5 flex items-center gap-0.5 text-[11px] font-bold text-emerald-600 group-hover:text-emerald-800">
            <span>Collection report</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>

        {/* CARD 3: TOTAL CUSTOMER OUTSTANDING (orange/red) — balance as of period end */}
        <Link
          href={`/reports/outstanding${reportQuery}`}
          className="group col-span-2 max-[340px]:col-span-1 lg:col-span-1 bg-white rounded-xl p-3.5 sm:p-5 border border-slate-200 border-t-4 border-t-orange-500 shadow-2xs hover:shadow-sm hover:border-orange-300 transition-all flex flex-col justify-between h-full"
        >
          <div>
            <div className="flex items-start justify-between gap-1.5 mb-1.5 sm:mb-2">
              <div className="min-w-0">
                <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-orange-700 leading-tight">
                  Customer Outstanding
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium leading-tight mt-0.5">
                  {period.asOfLabel} · {outstanding.customers_with_dues} customers with dues
                </div>
              </div>
              <div className="p-1.5 sm:p-2 rounded-lg bg-orange-50 text-orange-600 shrink-0">
                <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </div>
            </div>
            <div className="text-base sm:text-2xl font-bold text-rose-600 tracking-tight break-words">
              {formatCurrency(outstanding.total_outstanding)}
            </div>

            <dl className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-2 lg:grid-cols-1 gap-x-4 gap-y-1 text-[11px] sm:text-xs">
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Unpaid bill amount</dt>
                <dd className="font-semibold text-slate-800 whitespace-nowrap">{formatCurrency(outstanding.total_unpaid_amount)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Unpaid / Partial bills</dt>
                <dd className="font-semibold text-slate-800 whitespace-nowrap">
                  {outstanding.unpaid_bills_count} / {outstanding.partially_paid_bills_count}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Unallocated credits</dt>
                <dd className="font-semibold text-emerald-700 whitespace-nowrap">{formatCurrency(outstanding.total_unallocated_credits)}</dd>
              </div>
              <div className="flex items-center justify-between gap-2">
                <dt className="text-slate-500">Customer advances</dt>
                <dd className="font-semibold text-emerald-700 whitespace-nowrap">{formatCurrency(outstanding.total_advances)}</dd>
              </div>
            </dl>
          </div>
          <div className="mt-2.5 flex items-center gap-0.5 text-[11px] font-bold text-orange-600 group-hover:text-orange-800">
            <span>Outstanding report</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </Link>
      </div>

      {/* Secondary indicator: Cash Outflows (kept from the previous dashboard, same period) */}
      <Link
        href="/cash-flow"
        className="flex items-center justify-between gap-3 bg-white rounded-xl px-3.5 sm:px-5 py-2.5 border border-slate-200 shadow-2xs hover:border-rose-200 transition-colors"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 shrink-0">
            <Wallet className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-slate-500">Cash Outflows</div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 truncate">Godown, staff & shop outflows · {periodLabel}</div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-sm sm:text-base font-bold text-slate-900">{formatCurrency(metrics.cash_outflows)}</span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </Link>

      {/* Quick Actions Section */}
      <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-slate-200 shadow-2xs">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Quick Operations & Voucher Entry
          </span>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Direct shortcuts to standard ERP ledgers
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          <Link
            href="/sales/new?category=cement"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-emerald-200/80 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-900 transition-colors group"
          >
            <div className="w-7 h-7 rounded-md bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Package className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold leading-tight">Create Cement Bill</span>
          </Link>

          <Link
            href="/sales/new?category=rod"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-amber-200/80 bg-amber-50/50 hover:bg-amber-50 text-amber-900 transition-colors group"
          >
            <div className="w-7 h-7 rounded-md bg-amber-600 text-white flex items-center justify-center shrink-0">
              <Hammer className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold leading-tight">Create Rod Bill</span>
          </Link>

          <Link
            href="/sales/new?category=daily"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-blue-200/80 bg-blue-50/50 hover:bg-blue-50 text-blue-900 transition-colors group"
          >
            <div className="w-7 h-7 rounded-md bg-blue-600 text-white flex items-center justify-center shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold leading-tight">Create Daily Bill</span>
          </Link>

          <Link
            href="/payments"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-purple-200/80 bg-purple-50/50 hover:bg-purple-50 text-purple-900 transition-colors group"
          >
            <div className="w-7 h-7 rounded-md bg-purple-600 text-white flex items-center justify-center shrink-0">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold leading-tight">Receive Payment</span>
          </Link>

          <Link
            href="/returns"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50/70 hover:bg-slate-100 text-slate-800 transition-colors group"
          >
            <div className="w-7 h-7 rounded-md bg-slate-700 text-white flex items-center justify-center shrink-0">
              <RotateCcw className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold leading-tight">Add Sales Return</span>
          </Link>

          <Link
            href="/cash-flow"
            className="flex items-center gap-2 p-2.5 rounded-lg border border-rose-200/80 bg-rose-50/50 hover:bg-rose-50 text-rose-900 transition-colors group"
          >
            <div className="w-7 h-7 rounded-md bg-rose-600 text-white flex items-center justify-center shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold leading-tight">Record Cash Outflow</span>
          </Link>
        </div>
      </div>

      {/* Visual Analytics Row: Chart & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Sales vs Collections Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 sm:mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Sales vs Collections Trend ({periodLabel})
                </h3>
                <p className="text-xs text-slate-500">
                  Tracking bill generation against realized cash & UPI collections
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold shrink-0">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Sales
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Collections
                </span>
              </div>
            </div>

            {hasTrendActivity ? (
              <div className="h-[230px] sm:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 6, right: 8, left: -12, bottom: 0 }}>
                    <defs>
                      <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563EB" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#16A34A" stopOpacity={0.22} />
                        <stop offset="95%" stopColor="#16A34A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                    <XAxis
                      dataKey="day"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: "#E2E8F0" }}
                    />
                    <YAxis
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => (v >= 1000 ? `₹${(v / 1000).toFixed(0)}k` : `₹${v}`)}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                        borderRadius: "8px",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        name === "sales" ? "Gross Sales" : "Collections",
                      ]}
                    />
                    <Area
                      type="monotone"
                      dataKey="sales"
                      stroke="#2563EB"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#2563EB" }}
                      activeDot={{ r: 5 }}
                      fillOpacity={1}
                      fill="url(#salesGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="collections"
                      stroke="#16A34A"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#16A34A" }}
                      activeDot={{ r: 5 }}
                      fillOpacity={1}
                      fill="url(#collGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[220px] sm:h-64 w-full flex flex-col items-center justify-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200 p-6 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-2.5">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <p className="text-xs sm:text-sm font-semibold text-slate-600">
                  No sales or collections recorded for this period.
                </p>
                <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                  Switch the reporting period filter above or create a new bill to view trend analytics.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Sales by Category
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Daily / Electrical, Cement Sales & Rod / Steel
            </p>

            {categoryData.some((c) => c.value > 0) ? (
              <div className="h-44 w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={48}
                      outerRadius={72}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#FFFFFF",
                        borderColor: "#E2E8F0",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={(value: number) => formatCurrency(value)}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-36 sm:h-44 w-full flex flex-col items-center justify-center rounded-xl bg-slate-50/70 border border-dashed border-slate-200 p-4 text-center">
                <PieChartIcon className="w-5 h-5 text-slate-400 mb-1.5" />
                <span className="text-xs font-semibold text-slate-500">
                  No category sales for this period.
                </span>
              </div>
            )}

            <div className="space-y-2 mt-3 pt-3 border-t border-slate-100">
              {categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color }}
                    ></span>
                    <span className="text-slate-700 font-medium">{cat.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Invoices & Transactions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Recent Invoices & Transactions
            </h3>
            <p className="text-xs text-slate-500">
              Showing latest bills for <span className="font-semibold text-slate-700">{periodLabel}</span>
            </p>
          </div>
          <Link
            href="/sales"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 shrink-0"
          >
            <span>View All Bills</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Mobile Compact Transaction Cards (< 768px) */}
        <div className="md:hidden divide-y divide-slate-100">
          {recentBills.length === 0 ? (
            <div className="py-8 px-4 text-center text-slate-400 text-xs font-medium">
              No sales invoices recorded for this period. Tap &quot;Create Bill&quot; to post a new invoice.
            </div>
          ) : (
            recentBills.map((bill) => {
              const catBadgeClass =
                bill.bill_category === "cement"
                  ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                  : bill.bill_category === "rod"
                  ? "bg-amber-100 text-amber-800 border-amber-200"
                  : "bg-blue-100 text-blue-800 border-blue-200";

              const catLabel =
                bill.bill_category === "cement"
                  ? "Cement"
                  : bill.bill_category === "rod"
                  ? "Rod / Steel"
                  : "Daily / Electrical";

              const isPaid =
                bill.payment_status === "legacy_paid_yes" || bill.payment_status === "paid";

              return (
                <div key={bill.id} className="p-3.5 hover:bg-slate-50/70 transition-colors space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-blue-600">
                          Bill: {bill.bill_number}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${catBadgeClass}`}
                        >
                          {catLabel}
                        </span>
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-1">
                        Customer: {bill.customer_name}
                        {bill.customer_name === "UNKNOWN" && (
                          <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-normal">
                            Retail
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm font-extrabold text-slate-900">
                        {formatCurrency(bill.total_amount)}
                      </div>
                      <span
                        className={`inline-block mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          isPaid
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {bill.payment_status === "legacy_paid_yes"
                          ? "Legacy Paid"
                          : bill.payment_status === "paid"
                          ? "Settled"
                          : "Unpaid / Credit"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <span>Date: {formatDate(bill.bill_date)}</span>
                    <span className="truncate max-w-[180px]">
                      {bill.cement_details
                        ? `${bill.cement_details.qty_bags} Bags (${bill.cement_details.cement_type})`
                        : bill.rod_details
                        ? `${bill.rod_details.qty_kg} Kg (${bill.rod_details.rod_size})`
                        : "Electrical Goods"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop & Tablet Data Table (>= 768px) — Preserved Unchanged */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Bill No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Details / Brand</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {recentBills.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-medium">
                    No sales invoices recorded for this period. Click &quot;Create Bill&quot; to post your first invoice.
                  </td>
                </tr>
              ) : (
                recentBills.map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-blue-600">
                      {bill.bill_number}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {formatDate(bill.bill_date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {bill.customer_name}
                      {bill.customer_name === "UNKNOWN" && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-normal">
                          Retail
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          bill.bill_category === "cement"
                            ? "bg-emerald-100 text-emerald-800"
                            : bill.bill_category === "rod"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {bill.bill_category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {bill.cement_details ? (
                        <span>
                          {bill.cement_details.qty_bags} Bags ({bill.cement_details.cement_type})
                        </span>
                      ) : bill.rod_details ? (
                        <span>
                          {bill.rod_details.qty_kg} Kg ({bill.rod_details.rod_size})
                        </span>
                      ) : (
                        <span>Electrical Goods</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatCurrency(bill.total_amount)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          bill.payment_status === "legacy_paid_yes" ||
                          bill.payment_status === "paid"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {bill.payment_status === "legacy_paid_yes"
                          ? "Legacy Paid"
                          : bill.payment_status === "paid"
                          ? "Settled"
                          : "Unpaid / Credit"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
