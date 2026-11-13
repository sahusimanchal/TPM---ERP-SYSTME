"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { getReturns, saveReturns, getCustomers, saveCustomers, getBills, createCustomer } from "@/lib/storage";
import { SalesReturn, Customer } from "@/lib/types";
import { formatCurrency, formatDate, getTodayDateString } from "@/lib/utils";
import { Undo2, CheckCircle2, AlertTriangle, Search, Plus, X, ShieldAlert, Zap, ChevronDown } from "lucide-react";

export default function ReturnsPage() {
  const [returns, setReturns] = useState<SalesReturn[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [returnDate, setReturnDate] = useState(getTodayDateString());
  const [itemType, setItemType] = useState("ELECTRIC");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const loadData = () => {
    setReturns(getReturns());
    const custs = getCustomers();
    setCustomers(custs);
  };

  useEffect(() => {
    loadData();
    window.addEventListener("tpm_data_updated", loadData);
    return () => window.removeEventListener("tpm_data_updated", loadData);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dynamic party search: if user enters letter 'S', all parties starting with 'S' appear first
  const matchingCustomers = useMemo(() => {
    const q = customerSearch.trim().toLowerCase();
    if (!q) return customers.slice(0, 30);

    const startsWith: Customer[] = [];
    const contains: Customer[] = [];

    for (const c of customers) {
      const name = c.name.toLowerCase();
      const phone = c.phone || "";
      const code = (c.code || "").toLowerCase();

      if (name.startsWith(q)) {
        startsWith.push(c);
      } else if (name.includes(q) || phone.includes(q) || code.includes(q)) {
        contains.push(c);
      }
    }

    return [...startsWith, ...contains].slice(0, 60);
  }, [customers, customerSearch]);

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerSearch(c.name);
    setIsDropdownOpen(false);
  };

  const handleClearCustomer = () => {
    setSelectedCustomerId("");
    setCustomerSearch("");
    setIsDropdownOpen(true);
  };

  const handleSelectUnknownCustomer = () => {
    let unknownCust = customers.find(c => c.is_unidentified || c.name.toUpperCase().includes("UNKNOWN"));
    if (!unknownCust) {
      unknownCust = createCustomer({
        name: "UNKNOWN (RETAIL CASH)",
        is_unidentified: true,
        address: "Over-the-Counter",
        phone: "+91 98610 10000"
      });
      loadData();
    }
    handleSelectCustomer(unknownCust);
  };

  const handleCreateNewParty = (partyName: string) => {
    if (!partyName.trim()) return;
    const newCust = createCustomer({
      name: partyName.trim().toUpperCase()
    });
    loadData();
    handleSelectCustomer(newCust);
  };

  const handleOpenAddModal = () => {
    setSelectedCustomerId("");
    setCustomerSearch("");
    setIsDropdownOpen(false);
    setAmount("");
    setReason("");
    setShowAddModal(true);
  };

  const handleApprove = (id: string) => {
    const updated = returns.map(r => {
      if (r.id === id) {
        return { ...r, status: "approved" as const, is_verified: true };
      }
      return r;
    });
    saveReturns(updated);
  };

  const handleReject = (id: string) => {
    const updated = returns.map(r => {
      if (r.id === id) {
        return { ...r, status: "rejected" as const, is_verified: false };
      }
      return r;
    });
    saveReturns(updated);
  };

  const handleCreateReturn = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === selectedCustomerId);
    if (!cust) return;

    const amt = parseFloat(amount) || 0;
    const newReturn: SalesReturn = {
      id: `ret-${Date.now()}`,
      return_number: `RET-2026-${(returns.length + 1).toString().padStart(3, "0")}`,
      customer_id: cust.id,
      customer_name: cust.name,
      return_date: returnDate,
      item_type: itemType,
      amount: amt,
      reason: reason.trim() || "Customer return",
      status: "approved", // User manually creating one can be marked approved
      is_verified: true,
      is_imported: false,
      created_at: new Date().toISOString()
    };

    saveReturns([newReturn, ...returns]);

    // Deduct return amount from customer balance atomically
    const allCusts = getCustomers();
    const cIdx = allCusts.findIndex(c => c.id === cust.id);
    if (cIdx >= 0) {
      allCusts[cIdx].current_balance -= amt;
      saveCustomers(allCusts);
    }

    setShowAddModal(false);
    setAmount("");
    setReason("");
  };

  const filtered = returns.filter(r =>
    r.customer_name.toLowerCase().includes(search.toLowerCase()) ||
    r.return_number.toLowerCase().includes(search.toLowerCase())
  );

  const pendingCount = returns.filter(r => r.status === "pending_review").length;
  const approvedTotal = returns
    .filter(r => r.status === "approved")
    .reduce((acc, r) => acc + (r.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Sales Returns & Material Exchanges
          </h1>
          <p className="text-sm text-slate-500">
            Audit and verify customer goods returns before net sales or ledger deduction
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Sales Return</span>
        </button>
      </div>

      {/* Verification Gate Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold text-amber-900">
              Accounting Verification Gate ({pendingCount} Pending)
            </div>
            <div className="text-xs text-amber-700">
              Only verified/approved returns reduce Net Sales. Unverified legacy returns remain in review to prevent silent balance degradation.
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-xs text-slate-500 font-semibold uppercase">Approved Deductions:</span>
          <div className="text-base font-bold text-emerald-700">{formatCurrency(approvedTotal)}</div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search return by voucher no, customer name..."
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
                <th className="py-3 px-4">Return No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Item Type</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Audit Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-medium">
                    No sales returns recorded. All ledger entries verified.
                  </td>
                </tr>
              ) : (
                filtered.map((ret) => {
                  const isPending = ret.status === "pending_review";
                  const isApproved = ret.status === "approved";
                  const isMissingAmount = ret.amount === null || isNaN(ret.amount as any);

                  return (
                    <tr key={ret.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {ret.return_number}
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-medium">
                        {formatDate(ret.return_date)}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {ret.customer_name}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        {ret.item_type}
                      </td>
                      <td className="py-3 px-4 text-right font-bold">
                        {isMissingAmount ? (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-amber-200">
                            Missing in Excel
                          </span>
                        ) : (
                          <span className="text-rose-600">-{formatCurrency(ret.amount)}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${isApproved
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isPending
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : "bg-slate-100 text-slate-600"
                          }`}>
                          {isApproved ? "Approved & Verified" : isPending ? "Pending Review" : "Rejected"}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isPending ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleApprove(ret.id)}
                              className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(ret.id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] font-semibold"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-[11px]">Audited</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Return Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200">
              <h3 className="font-bold text-slate-900 text-base">Record Sales Return</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-4 text-xs">
              {/* Dynamic Searchable Combobox for Customer */}
              <div className="relative space-y-1.5" ref={dropdownRef}>
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700">
                    Customer / Party <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectUnknownCustomer}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                  >
                    <Zap className="w-3 h-3 text-amber-500" />
                    <span>Quick: Retail (UNKNOWN)</span>
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={customerSearch}
                    onFocus={() => setIsDropdownOpen(true)}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setSelectedCustomerId("");
                      setIsDropdownOpen(true);
                    }}
                    placeholder="Type party name (e.g. type 'S' for Sahu, Shree...)"
                    className={`w-full pl-8 pr-8 py-2 text-xs rounded-lg border font-semibold bg-white transition-all focus:outline-none focus:ring-2 ${selectedCustomerId
                      ? "border-blue-400 ring-2 ring-blue-500/20 text-slate-900"
                      : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 text-slate-800"
                      }`}
                  />

                  {customerSearch ? (
                    <button
                      type="button"
                      onClick={handleClearCustomer}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100"
                      title="Clear customer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  )}
                </div>

                {/* Autocomplete Dropdown */}
                {isDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl border border-slate-200 shadow-2xl max-h-52 overflow-y-auto divide-y divide-slate-100">
                    <div className="p-1.5 bg-slate-50 text-[10px] font-semibold text-slate-500 flex items-center justify-between border-b border-slate-200 sticky top-0">
                      <span>Matching Customers ({matchingCustomers.length})</span>
                      <span className="text-[10px] text-slate-400">Click to select</span>
                    </div>

                    {/* Quick Add Party if not exists */}
                    {customerSearch.trim() && !customers.some(c => c.name.toLowerCase() === customerSearch.trim().toLowerCase()) && (
                      <div className="p-2 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between gap-2">
                        <span className="text-[11px] text-blue-900 font-medium truncate">
                          Party not found: <strong className="font-bold">&quot;{customerSearch.trim().toUpperCase()}&quot;</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCreateNewParty(customerSearch)}
                          className="shrink-0 px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold shadow-xs transition-colors"
                        >
                          + Add New Party
                        </button>
                      </div>
                    )}

                    {matchingCustomers.length > 0 ? (
                      matchingCustomers.map((c) => {
                        const isMatchPrefix = customerSearch.trim() && c.name.toLowerCase().startsWith(customerSearch.trim().toLowerCase());
                        return (
                          <button
                            type="button"
                            key={c.id}
                            onClick={() => handleSelectCustomer(c)}
                            className={`w-full text-left p-2 hover:bg-blue-50/80 transition-colors flex items-center justify-between text-xs ${selectedCustomerId === c.id ? "bg-blue-50 font-bold" : ""
                              }`}
                          >
                            <div>
                              <div className="font-bold text-slate-900">
                                <span className={isMatchPrefix ? "text-blue-700 underline underline-offset-2" : ""}>
                                  {c.name}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {c.phone && <span>📞 {c.phone}</span>}
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <span className={`text-[10px] font-semibold ${c.current_balance > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                                Due: {formatCurrency(c.current_balance)}
                              </span>
                            </div>
                          </button>
                        );
                      })
                    ) : customerSearch.trim() ? (
                      <div className="p-3 text-center text-xs text-slate-500">
                        <p>No customer found matching &quot;<strong>{customerSearch}</strong>&quot;.</p>
                        <button
                          type="button"
                          onClick={() => handleCreateNewParty(customerSearch)}
                          className="mt-2 inline-flex items-center gap-1 px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold shadow-xs transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Create &quot;{customerSearch.trim().toUpperCase()}&quot;</span>
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 text-center text-xs text-slate-400">
                        <p className="font-semibold text-slate-600">No customer accounts yet.</p>
                        <p className="mt-0.5 text-[10px]">Type name to create on the fly, or click &quot;Quick: Retail (UNKNOWN)&quot;.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Selected Confirmation Details Card */}
                {selectedCustomer && (
                  <div className="p-2 rounded-lg bg-blue-50 border border-blue-200 text-xs flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="font-bold text-blue-950">{selectedCustomer.name}</span>
                    </div>
                    <span className="font-bold text-blue-800 text-[11px]">
                      Ledger Due: {formatCurrency(selectedCustomer.current_balance)}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={returnDate}
                    onChange={(e) => setReturnDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Item Category *</label>
                  <select
                    value={itemType}
                    onChange={(e) => setItemType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    <option value="ELECTRIC">ELECTRIC</option>
                    <option value="CEMENT">CEMENT</option>
                    <option value="ROD">ROD / STEEL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Return Amount (₹) *</label>
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
                <label className="block font-semibold text-slate-700 mb-1">Reason for Return</label>
                <input
                  type="text"
                  placeholder="e.g. Defective wire / Excess bags"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
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
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm"
                >
                  Save & Approve Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
