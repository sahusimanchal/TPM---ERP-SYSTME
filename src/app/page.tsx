"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  CreditCard, 
  Wallet, 
  AlertCircle, 
  PlusCircle,
  FileText,
  Clock,
  Layers,
  CheckCircle2,
  Receipt
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { calculateDashboardMetrics, getBills, getCustomers, getPayments, getReturns } from "@/lib/storage";
import { Bill, DashboardMetrics } from "@/lib/types";
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
  BarChart, 
  Bar, 
  CartesianGrid,
  Legend
} from "recharts";

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [period, setPeriod] = useState<"october" | "all">("october");

  useEffect(() => {
    const loadData = () => {
      const dateFilter = period === "october" 
        ? { start: "2026-10-01", end: "2026-10-31" }
        : undefined;

      const m = calculateDashboardMetrics(dateFilter);
      setMetrics(m);

      const allBills = getBills();
      setRecentBills(allBills.slice(0, 8));
    };

    loadData();
    window.addEventListener("tpm_data_updated", loadData);
    return () => window.removeEventListener("tpm_data_updated", loadData);
  }, [period]);

  if (!metrics) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading ERP Dashboard...</div>;
  }

  // Visual Category Breakdown data
  const categoryData = [
    { name: "Daily / Electrical", value: 1015463, color: "#2563EB" },
    { name: "Cement Sales", value: 640965, color: "#059669" },
    { name: "Rod & Steel", value: 0, color: "#D97706" },
  ];

  // Visual Payment Mode Breakdown
  const paymentModeData = [
    { mode: "CASH", amount: 2050000 },
    { mode: "UPI", amount: 550000 },
    { mode: "CC UPI", amount: 50000 },
    { mode: "SBI Bank", amount: 16288 },
  ];

  // Daily Trend Mock based on October data
  const trendData = [
    { day: "01-10", sales: 48200, collections: 52900 },
    { day: "05-10", sales: 62400, collections: 45000 },
    { day: "10-10", sales: 78500, collections: 98000 },
    { day: "15-10", sales: 55100, collections: 61000 },
    { day: "20-10", sales: 94200, collections: 85000 },
    { day: "25-10", sales: 71000, collections: 79000 },
    { day: "31-10", sales: 86000, collections: 92000 },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner & Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Financial & Operations Dashboard
          </h1>
          <p className="text-sm text-slate-500">
            Real-time accounting status, sales categories, collections & customer balances
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-200 p-1 rounded-lg text-xs font-semibold">
            <button
              onClick={() => setPeriod("october")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                period === "october" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              OCT 2026 (Historical)
            </button>
            <button
              onClick={() => setPeriod("all")}
              className={`px-3 py-1.5 rounded-md transition-all ${
                period === "all" ? "bg-white text-blue-600 shadow-2xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Records
            </button>
          </div>

          <Link
            href="/sales/new"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Bill</span>
          </Link>
        </div>
      </div>

      {/* Data Quality & Unverified Queue Banner */}
      {(metrics.unverified_returns_count > 0 || metrics.data_quality_issues_count > 0) && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-900">
                Action Required: Data Quality & Unverified Records Queue
              </div>
              <div className="text-xs text-amber-700">
                {metrics.unverified_returns_count} legacy sales returns require verification. 
                Accounting rules prohibit reducing net sales until approved.
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
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

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Sales</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(metrics.gross_sales)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Valid posted bills (Cement + Daily)</span>
          </div>
        </div>

        {/* Net Sales */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Net Sales</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(metrics.net_sales)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            After {formatCurrency(metrics.approved_returns)} approved returns
          </div>
        </div>

        {/* Total Collections */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Collections</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(metrics.total_collections)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Cash, UPI & Bank Receipts
          </div>
        </div>

        {/* Cash Given / Outflows */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cash Outflows</span>
            <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {formatCurrency(metrics.cash_outflows)}
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium">
            Godown transfers, staff & shop expenses
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: Chart & Category Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales vs Collections Trend */}
        <div className="lg:col-span-2 bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Sales vs Collections Trend (OCT 2026)
                </h3>
                <p className="text-xs text-slate-500">
                  Tracking bill generation against realized cash & UPI collections
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold">
                <span className="flex items-center gap-1.5 text-blue-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Sales
                </span>
                <span className="flex items-center gap-1.5 text-emerald-600">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Collections
                </span>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="collGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="day" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v/1000}k`} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Area type="monotone" dataKey="sales" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#salesGrad)" />
                  <Area type="monotone" dataKey="collections" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#collGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Category Breakdown Donut */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Sales by Category
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Electrical Daily Sales vs Cement Brands & Steel
            </p>

            <div className="h-44 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2 mt-2 pt-3 border-t border-slate-100">
              {categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                    <span className="text-slate-700 font-medium">{cat.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{formatCurrency(cat.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Recent Bills Data Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Recent Invoices & Transactions
            </h3>
            <p className="text-xs text-slate-500">
              Showing latest bills generated or imported from the financial ledger
            </p>
          </div>
          <Link
            href="/sales"
            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1"
          >
            <span>View All Bills</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
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
              {recentBills.map((bill) => (
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
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                      bill.bill_category === "cement" 
                        ? "bg-emerald-100 text-emerald-800" 
                        : bill.bill_category === "rod"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-blue-100 text-blue-800"
                    }`}>
                      {bill.bill_category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">
                    {bill.cement_details ? (
                      <span>{bill.cement_details.qty_bags} Bags ({bill.cement_details.cement_type})</span>
                    ) : bill.rod_details ? (
                      <span>{bill.rod_details.qty_kg} Kg ({bill.rod_details.rod_size})</span>
                    ) : (
                      <span>Electrical Goods</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatCurrency(bill.total_amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                      bill.payment_status === "legacy_paid_yes" || bill.payment_status === "paid"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}>
                      {bill.payment_status === "legacy_paid_yes" 
                        ? "Legacy Paid" 
                        : bill.payment_status === "paid"
                        ? "Settled"
                        : "Unpaid / Credit"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
