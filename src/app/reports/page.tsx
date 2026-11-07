"use client";

import { useState, useEffect } from "react";
import { getBills, getPayments, getReturns, getCashTransactions, getCustomers } from "@/lib/storage";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BarChart3, TrendingUp, PieChart, Download, Printer, ShieldCheck } from "lucide-react";

export default function ReportsPage() {
  const [bills, setBills] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [cashTxs, setCashTxs] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);

  useEffect(() => {
    setBills(getBills());
    setPayments(getPayments());
    setReturns(getReturns());
    setCashTxs(getCashTransactions());
    setCustomers(getCustomers());
  }, []);

  const grossSales = bills.filter(b => b.status === "posted").reduce((acc, b) => acc + (b.total_amount || 0), 0);
  const approvedReturns = returns.filter(r => r.status === "approved" || r.is_verified).reduce((acc, r) => acc + (r.amount || 0), 0);
  const netSales = grossSales - approvedReturns;

  const verifiedExpenses = cashTxs
    .filter(c => c.is_categorized && c.category !== "Godown Transfer" && c.category !== "Uncategorized Outflow")
    .reduce((acc, c) => acc + (c.amount || 0), 0);

  // Cement brand analysis
  const cementBills = bills.filter(b => b.bill_category === "cement" && b.cement_details);
  const brandStats: Record<string, { bags: number; amount: number }> = {};
  for (const b of cementBills) {
    const brand = b.cement_details.cement_type || "OTHER";
    if (!brandStats[brand]) {
      brandStats[brand] = { bags: 0, amount: 0 };
    }
    brandStats[brand].bags += b.cement_details.qty_bags || 0;
    brandStats[brand].amount += b.cement_details.amount || 0;
  }

  // Top Debtors
  const topDebtors = [...customers]
    .filter(c => c.current_balance > 0)
    .sort((a, b) => b.current_balance - a.current_balance)
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Comprehensive Financial & Audit Reports
          </h1>
          <p className="text-sm text-slate-500">
            Accounting statements, category metrics, brand reports and customer balances
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <Printer className="w-4 h-4" />
          <span>Print Statement</span>
        </button>
      </div>

      {/* Accounting P&L Statement Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">Double-Entry Accounting</span>
            <h3 className="text-lg font-bold text-slate-900">Profit & Loss Statement (OCT 2026)</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Basis: Accrual & Realized</span>
        </div>

        <div className="space-y-2 text-xs font-mono">
          <div className="flex justify-between py-1 text-slate-700">
            <span>Gross Revenue (Sales Invoices Posted)</span>
            <span className="font-bold">{formatCurrency(grossSales)}</span>
          </div>
          <div className="flex justify-between py-1 text-rose-600">
            <span>Less: Verified Sales Returns</span>
            <span>-{formatCurrency(approvedReturns)}</span>
          </div>
          <div className="flex justify-between py-2 border-t border-b border-slate-200 font-bold text-slate-900 text-sm">
            <span>NET SALES REVENUE</span>
            <span className="text-blue-700">{formatCurrency(netSales)}</span>
          </div>

          <div className="flex justify-between py-1 text-slate-600 pt-2">
            <span>Verified Operating & Shop Expenses</span>
            <span className="font-semibold">{formatCurrency(verifiedExpenses)}</span>
          </div>
          <div className="flex justify-between py-1 text-slate-400 italic text-[11px]">
            <span>(Note: Godown transfers & uncategorized cash are excluded from expenses)</span>
            <span>—</span>
          </div>

          <div className="flex justify-between py-2 border-t-2 border-slate-900 font-bold text-base text-emerald-700 pt-2">
            <span>OPERATING SURPLUS / GROSS MARGIN</span>
            <span>{formatCurrency(netSales - verifiedExpenses)}</span>
          </div>
        </div>
      </div>

      {/* Cement Brand Sales Report */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm">Cement Brand Distribution & Rate Realization</h3>
          <p className="text-xs text-slate-500">Volume (Bags), Total Value (₹), and Average Realized Rate</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Cement Brand</th>
                <th className="py-3 px-4 text-center">Bags Sold</th>
                <th className="py-3 px-4 text-right">Total Revenue</th>
                <th className="py-3 px-4 text-right">Avg Rate / Bag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {Object.entries(brandStats).map(([brand, stat]) => (
                <tr key={brand} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{brand}</td>
                  <td className="py-3 px-4 text-center font-bold text-blue-600">{stat.bags} Bags</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{formatCurrency(stat.amount)}</td>
                  <td className="py-3 px-4 text-right text-slate-500 font-mono">
                    ₹{(stat.amount / (stat.bags || 1)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 10 Outstanding Receivables */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-900 text-sm">Top Outstanding Customer Balances (Aging Ledger)</h3>
          <p className="text-xs text-slate-500">Parties with highest pending balances requiring collection follow-up</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-right">Total Invoiced</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Current Outstanding Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {topDebtors.map((cust) => (
                <tr key={cust.id} className="hover:bg-slate-50/70">
                  <td className="py-3 px-4 font-bold text-slate-900">{cust.name}</td>
                  <td className="py-3 px-4 text-slate-500">{cust.phone || "—"}</td>
                  <td className="py-3 px-4 text-right font-medium text-slate-700">{formatCurrency(cust.total_bills_amount)}</td>
                  <td className="py-3 px-4 text-right font-medium text-emerald-700">{formatCurrency(cust.total_paid_amount)}</td>
                  <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">{formatCurrency(cust.current_balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
