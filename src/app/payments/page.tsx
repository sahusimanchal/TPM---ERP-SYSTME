"use client";

import { useState, useEffect } from "react";
import { getPayments, getCustomers, getBills, recordPayment } from "@/lib/storage";
import { Payment, Customer, Bill, PaymentMode } from "@/lib/types";
import { formatCurrency, formatDate, getTodayDateString } from "@/lib/utils";
import { Search, Plus, CreditCard, DollarSign, X, Check, Receipt, Wallet, Layers } from "lucide-react";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [payDate, setPayDate] = useState(getTodayDateString());
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>("CASH");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");

  const loadData = () => {
    setPayments(getPayments());
    const custs = getCustomers();
    setCustomers(custs);
    if (custs.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(custs[0].id);
    }
  };

  useEffect(() => {
    loadData();
    window.addEventListener("tpm_data_updated", loadData);
    return () => window.removeEventListener("tpm_data_updated", loadData);
  }, []);

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) return;

    const amt = parseFloat(payAmount) || 0;
    if (amt <= 0) return;

    recordPayment({
      customer_id: cust.id,
      customer_name: cust.name,
      payment_date: payDate,
      amount: amt,
      payment_mode: payMode,
      reference_number: refNo.trim() || undefined,
      notes: notes.trim() || undefined
    });

    setShowAddModal(false);
    setPayAmount("");
    setRefNo("");
    setNotes("");
  };

  const filtered = payments.filter(p => {
    const matchesMode = modeFilter === "ALL" || p.payment_mode === modeFilter;
    const matchesSearch = p.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      p.receipt_number.toLowerCase().includes(search.toLowerCase()) ||
      (p.reference_number && p.reference_number.toLowerCase().includes(search.toLowerCase()));
    return matchesMode && matchesSearch;
  });

  const totalCollected = filtered.reduce((acc, p) => acc + (p.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Payments Received & Collections
          </h1>
          <p className="text-sm text-slate-500">
            {payments.length} receipts • Total Collected: {formatCurrency(totalCollected)}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Mode Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex bg-slate-100 p-1 rounded-lg text-xs font-semibold w-full sm:w-auto">
          {["ALL", "CASH", "UPI", "CC UPI", "SBI"].map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-md transition-all ${
                modeFilter === m ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party, receipt, mode..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Ref Number</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.slice(0, 50).map((pay) => (
                <tr key={pay.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">
                    {pay.receipt_number}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-medium">
                    {formatDate(pay.payment_date)}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {pay.customer_name}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      pay.payment_mode === "CASH" 
                        ? "bg-amber-100 text-amber-800" 
                        : pay.payment_mode === "UPI"
                        ? "bg-blue-100 text-blue-800"
                        : "bg-purple-100 text-purple-800"
                    }`}>
                      {pay.payment_mode}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-500">
                    {pay.reference_number || "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-black text-emerald-700 text-sm">
                    {formatCurrency(pay.amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Posted
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Record Payment Receipt</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer / Party *</label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
                >
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} • Balance: {formatCurrency(c.current_balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Mode *</label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    <option value="CASH">CASH</option>
                    <option value="UPI">UPI</option>
                    <option value="CC UPI">CC UPI</option>
                    <option value="SBI">SBI BANK</option>
                    <option value="BANK_TRANSFER">BANK TRANSFER (NEFT/RTGS)</option>
                    <option value="CHEQUE">CHEQUE</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Paid (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-emerald-700"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reference / Transaction ID</label>
                <input
                  type="text"
                  placeholder="e.g. UPI / SBI Ref No"
                  value={refNo}
                  onChange={(e) => setRefNo(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold shadow-sm"
                >
                  Save Receipt & Credit Ledger
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
