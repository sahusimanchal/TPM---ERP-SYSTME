"use client";

import { useState, useEffect } from "react";
import { getCashTransactions, saveCashTransactions, getPayments } from "@/lib/storage";
import { CashTransaction } from "@/lib/types";
import { formatCurrency, formatDate, getTodayDateString } from "@/lib/utils";
import { Banknote, Search, Plus, Filter, Tag, Check, AlertCircle, ArrowDownCircle, Wallet } from "lucide-react";

export default function CashFlowPage() {
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [recipient, setRecipient] = useState("");
  const [date, setDate] = useState(getTodayDateString());
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Shop Expense");
  const [notes, setNotes] = useState("");

  const loadData = () => {
    setTransactions(getCashTransactions());
  };

  useEffect(() => {
    loadData();
    window.addEventListener("tpm_data_updated", loadData);
    return () => window.removeEventListener("tpm_data_updated", loadData);
  }, []);

  const handleCategorize = (id: string, newCategory: string) => {
    const updated = transactions.map(t => {
      if (t.id === id) {
        return { ...t, category: newCategory, is_categorized: true, is_verified: true };
      }
      return t;
    });
    saveCashTransactions(updated);
  };

  const handleAddOutflow = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (!recipient.trim() || amt <= 0) return;

    const newTx: CashTransaction = {
      id: `cg-${Date.now()}`,
      transaction_type: "cash_given",
      transaction_date: date,
      recipient_name: recipient.trim().toUpperCase(),
      category: category,
      amount: amt,
      payment_mode: "CASH",
      reference_number: `VCH-${Date.now().toString().slice(-4)}`,
      notes: notes.trim() || undefined,
      is_categorized: true,
      is_verified: true,
      is_imported: false,
      created_at: new Date().toISOString()
    };

    saveCashTransactions([newTx, ...transactions]);
    setShowAddModal(false);
    setRecipient("");
    setAmount("");
    setNotes("");
  };

  const filtered = transactions.filter(t => {
    const matchesCat = categoryFilter === "ALL" || t.category === categoryFilter;
    const matchesSearch = t.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
      (t.reference_number && t.reference_number.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const totalOutflows = filtered.reduce((acc, t) => acc + (t.amount || 0), 0);
  const uncategorizedCount = transactions.filter(t => !t.is_categorized || t.category === "Uncategorized Outflow").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Cash Given & Outflows Register
          </h1>
          <p className="text-sm text-slate-500">
            {transactions.length} total payouts • Total Outflow: {formatCurrency(totalOutflows)}
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record Outflow</span>
        </button>
      </div>

      {/* Categorization Warning Banner */}
      {uncategorizedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-amber-900">
                {uncategorizedCount} Outflows Awaiting Categorization
              </div>
              <div className="text-xs text-amber-700">
                Recipients like GODOWN (₹1.90L) and individual staff payments must be classified before treating as operating expenses.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg text-xs font-semibold gap-1">
          {["ALL", "Godown Transfer", "Shop Expense", "Transport", "Uncategorized Outflow"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1.5 rounded-md transition-all ${
                categoryFilter === cat ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search payee, voucher..."
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
                <th className="py-3 px-4">Voucher No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Recipient / Payee</th>
                <th className="py-3 px-4">Expense Category</th>
                <th className="py-3 px-4 text-right">Amount Given</th>
                <th className="py-3 px-4 text-center">Audit Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-600">
                    {tx.reference_number || "VCH-HIST"}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-medium">
                    {formatDate(tx.transaction_date)}
                  </td>
                  <td className="py-3 px-4 font-bold text-slate-900">
                    {tx.recipient_name}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      tx.category === "Godown Transfer"
                        ? "bg-purple-100 text-purple-800"
                        : tx.category === "Shop Expense"
                        ? "bg-blue-100 text-blue-800"
                        : tx.category === "Transport"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}>
                      {tx.category}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-rose-600 text-sm">
                    {formatCurrency(tx.amount)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <select
                      value={tx.category}
                      onChange={(e) => handleCategorize(tx.id, e.target.value)}
                      className="px-2 py-1 rounded border border-slate-200 bg-white text-[11px] font-semibold text-slate-700"
                    >
                      <option value="Godown Transfer">Godown Transfer</option>
                      <option value="Shop Expense">Shop Expense</option>
                      <option value="Supplier Payment">Supplier Payment</option>
                      <option value="Staff Salary/Advance">Staff Advance</option>
                      <option value="Transport">Transport / Auto</option>
                      <option value="Rent">Shop Rent</option>
                      <option value="Uncategorized Outflow">Uncategorized</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Outflow Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Record Cash Given / Outflow</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOutflow} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recipient / Payee Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GODOWN, UMA, RENT"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 uppercase font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    <option value="Shop Expense">Shop Expense</option>
                    <option value="Godown Transfer">Godown Transfer</option>
                    <option value="Supplier Payment">Supplier Payment</option>
                    <option value="Staff Salary/Advance">Staff Advance</option>
                    <option value="Transport">Transport / Auto</option>
                    <option value="Rent">Shop Rent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Given (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-bold text-rose-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes / Description</label>
                <input
                  type="text"
                  placeholder="Purpose of outflow..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-bold shadow-sm"
                >
                  Record Cash Outflow
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
