"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { 
  getPayments, 
  getCustomers, 
  getBills, 
  recordPayment, 
  createCustomer,
  getPaymentModes,
  getStoredUserRole
} from "@/lib/storage";
import { Payment, Customer, Bill, PaymentMode, PaymentModeOption } from "@/lib/types";
import { formatCurrency, formatDate, getTodayDateString } from "@/lib/utils";
import { getClientSession } from "@/lib/auth";
import { 
  Search, 
  Plus, 
  CreditCard, 
  DollarSign, 
  X, 
  Check, 
  Receipt, 
  Wallet, 
  Layers, 
  Zap, 
  ChevronDown, 
  CheckCircle2, 
  Sparkles,
  Settings2
} from "lucide-react";
import PaymentAllocationModal from "@/components/payments/PaymentAllocationModal";
import { PaymentModeManagerModal } from "@/components/admin/MasterCatalogModals";

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState<string>("ALL");
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedPaymentForAlloc, setSelectedPaymentForAlloc] = useState<Payment | null>(null);
  const [showAllocModal, setShowAllocModal] = useState(false);

  // Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [payDate, setPayDate] = useState(getTodayDateString());
  const [payAmount, setPayAmount] = useState("");
  const [payMode, setPayMode] = useState<PaymentMode>("CASH");
  const [refNo, setRefNo] = useState("");
  const [notes, setNotes] = useState("");

  // Dynamic Master Modes
  const [paymentModes, setPaymentModes] = useState<PaymentModeOption[]>([]);
  const [showModesModal, setShowModesModal] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const loadData = () => {
    setPayments(getPayments());
    const custs = getCustomers();
    setCustomers(custs);
    setPaymentModes(getPaymentModes());

    const session = getClientSession();
    const role = session?.user?.role || getStoredUserRole();
    setIsAdmin(role === "admin" || role === "owner");
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
    setPayAmount("");
    setRefNo("");
    setNotes("");
    setShowAddModal(true);
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerId) {
      alert("Please select a customer / party name.");
      return;
    }
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
    setSelectedCustomerId("");
    setCustomerSearch("");
    setPayAmount("");
    setRefNo("");
    setNotes("");
  };

  const filtered = payments.filter(p => {
    const unallocated = typeof p.unallocated_amount === "number"
      ? p.unallocated_amount
      : Math.max(0, p.amount - (p.allocations || []).reduce((s, a) => s + (a.allocated_amount || 0), 0));

    const matchesMode = 
      modeFilter === "ALL" ? true :
      modeFilter === "UNALLOCATED" ? unallocated > 0.005 :
      p.payment_mode === modeFilter;

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
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-colors"
        >
          <CreditCard className="w-4 h-4" />
          <span>Record Payment</span>
        </button>
      </div>

      {/* Mode Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-lg text-xs font-semibold w-full sm:w-auto">
          {["ALL", "UNALLOCATED", "CASH", "UPI", "CC UPI", "SBI"].map((m) => (
            <button
              key={m}
              onClick={() => setModeFilter(m)}
              className={`flex-1 sm:flex-initial px-3.5 py-1.5 rounded-md transition-all ${
                modeFilter === m ? "bg-white text-emerald-700 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {m === "UNALLOCATED" ? "Unallocated" : m}
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
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4">Receipt No</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Payment Mode</th>
                <th className="py-3 px-4">Ref Number</th>
                <th className="py-3 px-4 text-right">Amount Received</th>
                <th className="py-3 px-4">Allocation Status</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 text-xs font-medium">
                    No payment receipts found. Click &quot;Record Payment&quot; to log your first collection.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 50).map((pay) => {
                  const allocated = (pay.allocations || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
                  const unallocated = Math.max(0, (pay.amount || 0) - allocated);
                  const isFullyAllocated = unallocated <= 0.005;

                  return (
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
                      <td className="py-3 px-4 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="py-3 px-4">
                        {isFullyAllocated ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Fully Allocated
                          </span>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              {unallocated >= pay.amount - 0.005 ? "Unallocated" : "Partially Allocated"}
                            </span>
                            <div className="text-[10px] font-bold text-emerald-700">
                              {formatCurrency(unallocated)} credit
                            </div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPaymentForAlloc(pay);
                            setShowAllocModal(true);
                          }}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-colors border ${
                            !isFullyAllocated
                              ? "bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200 font-semibold text-[11px]"
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{!isFullyAllocated ? "Allocate" : "History"}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
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
                    className={`w-full pl-8 pr-8 py-2 text-xs rounded-lg border font-semibold bg-white transition-all focus:outline-none focus:ring-2 ${
                      selectedCustomerId 
                        ? "border-emerald-400 ring-2 ring-emerald-500/20 text-slate-900" 
                        : "border-slate-300 focus:border-emerald-500 focus:ring-emerald-500/20 text-slate-800"
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
                            className={`w-full text-left p-2 hover:bg-emerald-50/80 transition-colors flex items-center justify-between text-xs ${
                              selectedCustomerId === c.id ? "bg-emerald-50 font-bold" : ""
                            }`}
                          >
                            <div>
                              <div className="font-bold text-slate-900">
                                <span className={isMatchPrefix ? "text-emerald-700 underline underline-offset-2" : ""}>
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
                  <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span className="font-bold text-emerald-950">{selectedCustomer.name}</span>
                    </div>
                    <span className="font-bold text-emerald-800 text-[11px]">
                      Pending Due: {formatCurrency(selectedCustomer.current_balance)}
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
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-semibold text-slate-700">Payment Mode *</label>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowModesModal(true)}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-0.5 rounded transition-colors"
                        title="Admin: Configure Payment Channels & Banks"
                      >
                        <Settings2 className="w-3 h-3" />
                        <span>Manage</span>
                      </button>
                    )}
                  </div>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value as PaymentMode)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white font-semibold"
                  >
                    {paymentModes.filter(m => m.isActive || m.code === payMode).map((m) => (
                      <option key={m.id} value={m.code}>{m.label} ({m.code})</option>
                    ))}
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

      {/* Payment Allocation Modal */}
      {showAllocModal && (
        <PaymentAllocationModal
          isOpen={showAllocModal}
          onClose={() => {
            setShowAllocModal(false);
            setSelectedPaymentForAlloc(null);
          }}
          payment={selectedPaymentForAlloc}
          onSuccess={loadData}
        />
      )}

      {/* Admin Payment Modes Manager */}
      <PaymentModeManagerModal
        isOpen={showModesModal}
        onClose={() => setShowModesModal(false)}
        onModeCreated={(m) => setPayMode(m.code as PaymentMode)}
      />
    </div>
  );
}
