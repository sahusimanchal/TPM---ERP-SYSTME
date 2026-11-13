"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getBills, getBusinessProfile } from "@/lib/storage";
import { Bill, BillCategory, BusinessProfile } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, PlusCircle, Printer, Eye, Filter, X, Receipt } from "lucide-react";

export default function SalesPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(getBusinessProfile());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<"all" | BillCategory>("all");
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  const loadData = () => {
    setBills(getBills());
    setBusinessProfile(getBusinessProfile());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("tpm_data_updated", loadData);
    return () => window.removeEventListener("tpm_data_updated", loadData);
  }, []);

  const filtered = bills.filter(b => {
    const matchesCat = categoryFilter === "all" || b.bill_category === categoryFilter;
    const matchesSearch = b.bill_number.toLowerCase().includes(search.toLowerCase()) ||
      b.customer_name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sales & Billing Register
          </h1>
          <p className="text-sm text-slate-500">
            {bills.length} total bills (Cement, Electrical Daily, Rod & Steel)
          </p>
        </div>

        <Link
          href="/sales/new"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Invoice</span>
        </Link>
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        {/* Category Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold w-full sm:w-auto">
          {(["all", "cement", "daily", "rod"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-md capitalize transition-all ${
                categoryFilter === cat ? "bg-white text-blue-600 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {cat === "all" ? "All Bills" : cat === "daily" ? "Electrical Daily" : cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search bill no, customer..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Bill No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Items / Details</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-medium">
                    No sales invoices found. Click &quot;New Invoice&quot; to create your first bill.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 50).map((bill) => (
                  <tr key={bill.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-blue-600">
                      {bill.bill_number}
                    </td>
                    <td className="py-3 px-4 text-slate-500 font-medium">
                      {formatDate(bill.bill_date)}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {bill.customer_name}
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
                    <td className="py-3 px-4 text-slate-600">
                      {bill.cement_details ? (
                        <span>{bill.cement_details.qty_bags} Bags • {bill.cement_details.cement_type} (₹{bill.cement_details.unit_rate}/bag)</span>
                      ) : bill.rod_details ? (
                        <span>{bill.rod_details.qty_kg} Kg • {bill.rod_details.rod_size} (₹{bill.rod_details.rate_per_kg}/kg)</span>
                      ) : (
                        <span>{bill.items[0]?.item_name || "Electrical Goods"}</span>
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
                          ? "Paid"
                          : "Unpaid / Credit"}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedBill(bill)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Preview Modal */}
      {selectedBill && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-base">Tax Invoice / Bill Preview</h3>
              </div>
              <button onClick={() => setSelectedBill(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Invoice Card */}
            <div className="p-4 my-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-4 text-xs font-mono">
              <div className="text-center border-b border-dashed border-slate-300 pb-3">
                <div className="font-bold text-base text-slate-900">{businessProfile.name}</div>
                <div className="text-slate-500 text-[11px]">{businessProfile.address} • GSTIN: {businessProfile.gstin}</div>
                <div className="text-slate-500 text-[11px]">Ph: {businessProfile.phone}</div>
              </div>

              <div className="flex justify-between">
                <div>
                  <span className="text-slate-400">INVOICE NO:</span> <strong className="text-slate-900 font-bold">{selectedBill.bill_number}</strong>
                </div>
                <div>
                  <span className="text-slate-400">DATE:</span> <strong className="text-slate-900 font-bold">{formatDate(selectedBill.bill_date)}</strong>
                </div>
              </div>

              <div className="border-t border-b border-slate-200 py-2">
                <span className="text-slate-400">CUSTOMER / PARTY:</span>
                <div className="font-bold text-slate-900 text-sm">{selectedBill.customer_name}</div>
              </div>

              <table className="w-full text-left">
                <thead className="border-b border-slate-200 text-slate-500 font-semibold">
                  <tr>
                    <th className="py-1">Description</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedBill.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-1.5 font-sans">{item.item_name}</td>
                      <td className="py-1.5 text-center">{item.quantity} {item.unit}</td>
                      <td className="py-1.5 text-right font-sans">{formatCurrency(item.unit_price, false)}</td>
                      <td className="py-1.5 text-right font-sans font-bold">{formatCurrency(item.total_amount, false)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-slate-300 pt-2 flex justify-between text-sm font-bold text-slate-900 font-sans">
                <span>TOTAL AMOUNT:</span>
                <span className="text-blue-700">{formatCurrency(selectedBill.total_amount)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSelectedBill(null)}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold text-xs"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-sm"
              >
                <Printer className="w-4 h-4" />
                <span>Print Invoice</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
