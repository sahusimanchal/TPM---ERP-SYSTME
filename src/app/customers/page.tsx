"use client";

import { useState, useEffect } from "react";
import { getCustomers, saveCustomers, getBills, getPayments } from "@/lib/storage";
import { Customer, Bill, Payment } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Search, Plus, UserPlus, FileSpreadsheet, Eye, X, Check, Phone, MapPin, Receipt, CreditCard } from "lucide-react";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerBills, setCustomerBills] = useState<Bill[]>([]);
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);

  // Form State
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newOpeningBalance, setNewOpeningBalance] = useState("0");

  const loadCustomers = () => {
    const list = getCustomers();
    setCustomers(list);
  };

  useEffect(() => {
    loadCustomers();
    window.addEventListener("tpm_data_updated", loadCustomers);
    return () => window.removeEventListener("tpm_data_updated", loadCustomers);
  }, []);

  const handleOpenLedger = (cust: Customer) => {
    setSelectedCustomer(cust);
    const bills = getBills().filter(b => b.customer_id === cust.id || b.customer_name === cust.name);
    const payments = getPayments().filter(p => p.customer_id === cust.id || p.customer_name === cust.name);
    setCustomerBills(bills);
    setCustomerPayments(payments);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const opBal = parseFloat(newOpeningBalance) || 0;
    const newCust: Customer = {
      id: `cust-${Date.now()}`,
      name: newName.trim().toUpperCase(),
      code: `CUST-${(customers.length + 1).toString().padStart(4, "0")}`,
      phone: newPhone.trim(),
      address: newAddress.trim() || "Bhubaneswar / Khordha",
      is_unidentified: false,
      is_active: true,
      opening_balance: opBal,
      current_balance: opBal,
      total_bills_amount: 0,
      total_paid_amount: 0,
      created_at: new Date().toISOString()
    };

    const updated = [newCust, ...customers];
    saveCustomers(updated);
    setShowAddModal(false);
    setNewName("");
    setNewPhone("");
    setNewAddress("");
    setNewOpeningBalance("0");
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search)) ||
    (c.code && c.code.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Customer Ledger & Directory
          </h1>
          <p className="text-sm text-slate-500">
            {customers.length} total party accounts, opening balances and running ledgers
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Customer</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search party by name, phone, code..."
            className="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      {/* Customer Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone / Contact</th>
                <th className="py-3 px-4 text-right">Billed Amount</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Net Balance</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.slice(0, 50).map((cust) => {
                const isReceivable = cust.current_balance > 0;
                return (
                  <tr key={cust.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500 font-medium">
                      {cust.code || "CUST-0000"}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        {cust.name}
                        {cust.is_unidentified && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 text-slate-600 font-normal">
                            Unidentified Over-the-Counter
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400">{cust.address}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {cust.phone || "—"}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-slate-800">
                      {formatCurrency(cust.total_bills_amount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      {formatCurrency(cust.total_paid_amount)}
                    </td>
                    <td className={`py-3 px-4 text-right font-bold ${isReceivable ? "text-rose-600" : "text-emerald-600"}`}>
                      {formatCurrency(cust.current_balance)}
                      <div className="text-[10px] font-normal text-slate-400">
                        {isReceivable ? "Due / Receivable" : "Cleared / Credit"}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleOpenLedger(cust)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-semibold text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ledger</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Ledger Statement Drawer / Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 bg-[#14243A] text-white flex items-center justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-blue-300 font-semibold">Customer Ledger Statement</span>
                <h2 className="text-xl font-bold text-white mt-0.5">{selectedCustomer.name}</h2>
                <div className="text-xs text-slate-300 flex items-center gap-3 mt-1">
                  <span>{selectedCustomer.phone || "No phone"}</span>
                  <span>•</span>
                  <span>{selectedCustomer.address}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Balances Summary */}
            <div className="grid grid-cols-3 p-4 bg-slate-50 border-b border-slate-200 text-xs">
              <div>
                <div className="text-slate-500 font-medium">Total Invoiced</div>
                <div className="text-base font-bold text-slate-900 mt-0.5">
                  {formatCurrency(selectedCustomer.total_bills_amount)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-medium">Total Paid / Received</div>
                <div className="text-base font-bold text-emerald-600 mt-0.5">
                  {formatCurrency(selectedCustomer.total_paid_amount)}
                </div>
              </div>
              <div>
                <div className="text-slate-500 font-medium">Net Outstanding Balance</div>
                <div className="text-base font-bold text-rose-600 mt-0.5">
                  {formatCurrency(selectedCustomer.current_balance)}
                </div>
              </div>
            </div>

            {/* Ledger Transactions */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                Transaction History ({customerBills.length} Bills, {customerPayments.length} Payments)
              </h4>

              <div className="space-y-2">
                {customerBills.map((b) => (
                  <div key={b.id} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-blue-50 text-blue-600">
                        <Receipt className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">Bill #{b.bill_number} ({b.bill_category.toUpperCase()})</div>
                        <div className="text-slate-400 text-[11px]">{formatDate(b.bill_date)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-900">{formatCurrency(b.total_amount)}</div>
                      <span className="text-[10px] text-amber-600 font-semibold">{b.payment_status}</span>
                    </div>
                  </div>
                ))}

                {customerPayments.map((p) => (
                  <div key={p.id} className="p-3 rounded-lg border border-emerald-200 bg-emerald-50/30 flex items-center justify-between text-xs hover:bg-emerald-50/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded bg-emerald-100 text-emerald-700">
                        <CreditCard className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-emerald-900">Payment Received ({p.payment_mode})</div>
                        <div className="text-emerald-700 text-[11px]">Receipt #{p.receipt_number} • {formatDate(p.payment_date)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-700">+{formatCurrency(p.amount)}</div>
                      <span className="text-[10px] text-emerald-600 font-semibold">Credited</span>
                    </div>
                  </div>
                ))}

                {customerBills.length === 0 && customerPayments.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs">
                    No transactions recorded for this customer yet.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold"
              >
                Print Statement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Create New Customer</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer / Party Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. SIBANI JENAPUR"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 uppercase"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+91 94370 00000"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Site Location</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="e.g. Loknathpur / Bhubaneswar"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Opening Balance (₹)</label>
                <input
                  type="number"
                  value={newOpeningBalance}
                  onChange={(e) => setNewOpeningBalance(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
