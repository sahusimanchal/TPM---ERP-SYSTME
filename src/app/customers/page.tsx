"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  getCustomers, 
  saveCustomers, 
  getBills, 
  getPayments, 
  getReturns,
  getCustomerUnallocatedPayments,
  getCustomerOutstandingBills,
  reversePaymentAllocation,
  getStoredUserRole,
  getBusinessProfile
} from "@/lib/storage";
import PaymentAllocationModal from "@/components/payments/PaymentAllocationModal";
import { Customer, Bill, Payment, SalesReturn, UserRole, BusinessProfile } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  Search, Plus, UserPlus, FileSpreadsheet, Eye, X, Check, Phone, MapPin, 
  Receipt, CreditCard, Printer, Download, ArrowDownRight, ArrowUpRight, 
  Loader2, Building2, CheckCircle2, ShieldCheck, AlertCircle,
  Sparkles, Layers, RotateCcw, History, ArrowRight, Lock
} from "lucide-react";
import * as XLSX from "xlsx";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [customerBills, setCustomerBills] = useState<Bill[]>([]);
  const [customerPayments, setCustomerPayments] = useState<Payment[]>([]);
  const [customerReturns, setCustomerReturns] = useState<SalesReturn[]>([]);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile>(getBusinessProfile());

  // Allocation & Ledger tabs
  const [ledgerTab, setLedgerTab] = useState<"statement" | "allocations">("statement");
  const [allocationPayment, setAllocationPayment] = useState<Payment | null>(null);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>("owner");
  const [reversingAllocId, setReversingAllocId] = useState<string | null>(null);
  const [reversalReasonInput, setReversalReasonInput] = useState("");

  // Form State
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddress, setNewAddress] = useState("");
  const [newOpeningBalance, setNewOpeningBalance] = useState("0");

  const loadCustomers = () => {
    const list = getCustomers();
    const allBills = getBills();
    const allPayments = getPayments();
    const allReturns = getReturns().filter(r => r.status === "approved" || r.is_verified);

    // Reconcile customer balances with bills, payments, and returns
    let modified = false;
    const reconciled = list.map(c => {
      const bSum = allBills
        .filter(b => b.customer_id === c.id || b.customer_name === c.name)
        .reduce((acc, b) => acc + (b.total_amount || 0), 0);
      const pSum = allPayments
        .filter(p => p.customer_id === c.id || p.customer_name === c.name)
        .reduce((acc, p) => acc + (p.amount || 0), 0);
      const rSum = allReturns
        .filter(r => r.customer_id === c.id || r.customer_name === c.name)
        .reduce((acc, r) => acc + (r.amount || 0), 0);

      const computedBal = (c.opening_balance || 0) + bSum - pSum - rSum;
      if (c.total_bills_amount !== bSum || c.total_paid_amount !== pSum || c.current_balance !== computedBal) {
        modified = true;
        return {
          ...c,
          total_bills_amount: bSum,
          total_paid_amount: pSum,
          current_balance: computedBal
        };
      }
      return c;
    });

    if (modified) {
      saveCustomers(reconciled);
    }
    setCustomers(reconciled);
  };

  useEffect(() => {
    loadCustomers();
    setBusinessProfile(getBusinessProfile());
    const onDataUpdate = () => {
      loadCustomers();
      setBusinessProfile(getBusinessProfile());
    };
    window.addEventListener("tpm_data_updated", onDataUpdate);
    return () => window.removeEventListener("tpm_data_updated", onDataUpdate);
  }, []);

  const handleOpenLedger = (cust: Customer, initialTab: "statement" | "allocations" = "statement") => {
    setSelectedCustomer(cust);
    setLedgerTab(initialTab);
    const bills = getBills().filter(b => b.customer_id === cust.id || b.customer_name === cust.name);
    const payments = getPayments().filter(p => p.customer_id === cust.id || p.customer_name === cust.name);
    const returns = getReturns().filter(r => (r.customer_id === cust.id || r.customer_name === cust.name) && (r.status === "approved" || r.is_verified));
    setCustomerBills(bills);
    setCustomerPayments(payments);
    setCustomerReturns(returns);
  };

  useEffect(() => {
    setUserRole(getStoredUserRole());
    if (selectedCustomer) {
      const bills = getBills().filter(b => b.customer_id === selectedCustomer.id || b.customer_name === selectedCustomer.name);
      const payments = getPayments().filter(p => p.customer_id === selectedCustomer.id || p.customer_name === selectedCustomer.name);
      const returns = getReturns().filter(r => (r.customer_id === selectedCustomer.id || r.customer_name === selectedCustomer.name) && (r.status === "approved" || r.is_verified));
      setCustomerBills(bills);
      setCustomerPayments(payments);
      setCustomerReturns(returns);
    }
  }, [customers, selectedCustomer]);

  // Deep link from reports (e.g. Customer Outstanding Report): /customers?ledger=<customer id>
  const [ledgerParamHandled, setLedgerParamHandled] = useState(false);
  useEffect(() => {
    if (ledgerParamHandled || customers.length === 0) return;
    const ledgerId = new URLSearchParams(window.location.search).get("ledger");
    if (ledgerId) {
      const cust = customers.find(c => c.id === ledgerId);
      if (cust) handleOpenLedger(cust);
    }
    setLedgerParamHandled(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, ledgerParamHandled]);

  // Compile detailed chronological ledger journal entries (Bills, Payments, Returns)
  const ledgerEntries = useMemo(() => {
    if (!selectedCustomer) return [];

    type Entry = {
      id: string;
      date: string;
      rawDate: string;
      type: "BILL" | "PAYMENT" | "RETURN";
      docNumber: string;
      category: string;
      particulars: string;
      debit: number;
      credit: number;
      balance: number;
    };

    const list: Entry[] = [];

    // 1. Bills (Debits)
    for (const b of customerBills) {
      let particulars = "";
      if (b.bill_category === "cement") {
        const type = b.cement_details?.cement_type || "Cement";
        const bags = b.cement_details?.qty_bags || 0;
        const rate = b.cement_details?.unit_rate || 0;
        particulars = bags > 0 
          ? `${type} Cement — ${bags} Bags @ ${formatCurrency(rate)}/bag` 
          : `${type} Cement Supply`;
      } else if (b.bill_category === "rod") {
        const size = b.rod_details?.rod_size || "Steel";
        const kg = b.rod_details?.qty_kg || 0;
        const rate = b.rod_details?.rate_per_kg || 0;
        particulars = kg > 0 
          ? `TMT Steel Rod ${size} — ${kg.toFixed(2)} Kg @ ${formatCurrency(rate)}/kg` 
          : `TMT Steel Rod Supply`;
      } else {
        if (b.items && b.items.length > 0) {
          particulars = b.items.map(it => `${it.item_name} (Qty: ${it.quantity})`).join(", ");
        } else {
          particulars = "Electrical & Hardware Daily Items Supply";
        }
      }

      list.push({
        id: b.id,
        date: b.bill_date ? formatDate(b.bill_date) : formatDate(b.created_at),
        rawDate: b.bill_date || b.created_at || "",
        type: "BILL",
        docNumber: `Bill #${b.bill_number}`,
        category: b.bill_category.toUpperCase(),
        particulars,
        debit: b.total_amount || 0,
        credit: 0,
        balance: 0
      });
    }

    // 2. Payments (Credits)
    for (const p of customerPayments) {
      const receiptShort = p.receipt_number ? p.receipt_number.replace(/^RCP-2026-|^RCP-/, "") : "";
      list.push({
        id: p.id,
        date: p.payment_date ? formatDate(p.payment_date) : formatDate(p.created_at),
        rawDate: p.payment_date || p.created_at || "",
        type: "PAYMENT",
        docNumber: receiptShort ? `Receipt #${receiptShort}` : `Receipt #${p.receipt_number}`,
        category: p.payment_mode,
        particulars: `Payment Received (${p.payment_mode})${p.reference_number ? ` • Ref: ${p.reference_number}` : ""}${p.notes ? ` • ${p.notes}` : ""}`,
        debit: 0,
        credit: p.amount || 0,
        balance: 0
      });
    }

    // 3. Sales Returns (Credits)
    for (const r of customerReturns) {
      list.push({
        id: r.id,
        date: r.return_date ? formatDate(r.return_date) : formatDate(r.created_at),
        rawDate: r.return_date || r.created_at || "",
        type: "RETURN",
        docNumber: `Ret #${r.return_number.replace(/^RET-2026-/, "")}`,
        category: "RETURN",
        particulars: `Credit Note (${r.item_type || "Materials"})${r.reason ? ` — ${r.reason}` : ""}`,
        debit: 0,
        credit: r.amount || 0,
        balance: 0
      });
    }

    // Sort chronologically ascending by rawDate
    list.sort((a, b) => a.rawDate.localeCompare(b.rawDate));

    // Calculate running balance starting with opening balance
    let running = selectedCustomer.opening_balance || 0;
    for (const item of list) {
      running += item.debit - item.credit;
      item.balance = running;
    }

    return list;
  }, [selectedCustomer, customerBills, customerPayments, customerReturns]);

  const unallocatedPayments = useMemo(() => {
    if (!selectedCustomer) return [];
    return getCustomerUnallocatedPayments(selectedCustomer.id || selectedCustomer.name);
  }, [selectedCustomer, customerPayments]);

  const totalCustomerUnallocated = useMemo(() => {
    return unallocatedPayments.reduce((sum, p) => {
      const allocated = (p.allocations || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
      return sum + Math.max(0, p.amount - allocated);
    }, 0);
  }, [unallocatedPayments]);

  const customerOutstandingBills = useMemo(() => {
    if (!selectedCustomer) return [];
    return getCustomerOutstandingBills(selectedCustomer.id || selectedCustomer.name);
  }, [selectedCustomer, customerBills, customerPayments, customerReturns]);

  const customerAllocationsHistory = useMemo(() => {
    if (!selectedCustomer) return [];
    const list: {
      allocationId: string;
      paymentId: string;
      receiptNumber: string;
      paymentDate: string | null;
      paymentMode: string;
      billId: string;
      billNumber: string;
      allocatedAmount: number;
      allocatedBy?: string;
      allocatedAt: string;
      notes?: string;
    }[] = [];

    for (const p of customerPayments) {
      if (p.status !== "posted") continue;
      for (const a of p.allocations || []) {
        list.push({
          allocationId: a.id,
          paymentId: p.id,
          receiptNumber: p.receipt_number,
          paymentDate: p.payment_date,
          paymentMode: p.payment_mode,
          billId: a.bill_id,
          billNumber: a.bill_number,
          allocatedAmount: a.allocated_amount,
          allocatedBy: a.allocated_by,
          allocatedAt: a.created_at,
          notes: a.notes,
        });
      }
    }
    list.sort((a, b) => b.allocatedAt.localeCompare(a.allocatedAt));
    return list;
  }, [selectedCustomer, customerPayments]);

  const handleReverseAllocationFromLedger = (paymentId: string, allocId: string) => {
    const res = reversePaymentAllocation({
      payment_id: paymentId,
      allocation_id: allocId,
      reason: reversalReasonInput.trim() || undefined,
    });
    if (!res.success) {
      alert(res.error || "Failed to reverse allocation.");
      return;
    }
    setReversingAllocId(null);
    setReversalReasonInput("");
    loadCustomers();
  };

  // Clean Print Handler: hides all website layout and prints only the statement
  const handlePrint = () => {
    document.body.classList.add("printing-ledger");
    window.print();
    window.addEventListener(
      "afterprint",
      () => {
        document.body.classList.remove("printing-ledger");
      },
      { once: true }
    );
  };

  // High-Resolution PDF Download Handler using offscreen clone at (0, 0)
  const handleDownloadPDF = async () => {
    if (!selectedCustomer) return;
    setIsGeneratingPDF(true);
    try {
      // Dynamic script loader for html2pdf
      const html2pdfLib =
        (window as any).html2pdf ||
        (await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
          script.onload = () => resolve((window as any).html2pdf);
          script.onerror = () => reject(new Error("Unable to load PDF library"));
          document.head.appendChild(script);
        }));

      const source = document.getElementById("printable-ledger-doc");
      if (!source) throw new Error("Document element not found");

      // Clone node into an isolated offscreen container positioned at (0, 0)
      // This completely prevents horizontal offset clipping in html2canvas!
      const clone = source.cloneNode(true) as HTMLElement;
      clone.style.width = "740px";
      clone.style.minWidth = "740px";
      clone.style.maxWidth = "740px";
      clone.style.margin = "0";
      clone.style.padding = "20px";
      clone.style.boxShadow = "none";
      clone.style.border = "none";
      clone.style.borderRadius = "0";
      clone.style.background = "#ffffff";

      const wrapper = document.createElement("div");
      wrapper.style.position = "fixed";
      wrapper.style.top = "0";
      wrapper.style.left = "0";
      wrapper.style.width = "740px";
      wrapper.style.zIndex = "-9999";
      wrapper.style.opacity = "1";
      wrapper.style.pointerEvents = "none";
      wrapper.style.background = "#ffffff";
      wrapper.appendChild(clone);
      document.body.appendChild(wrapper);

      const safeName = selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, "_");
      const opt = {
        margin: [6, 6, 6, 6],
        filename: `${safeName}_Ledger_Statement.pdf`,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { 
          scale: 2, 
          useCORS: true, 
          letterRendering: true,
          scrollY: 0,
          scrollX: 0
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" }
      };

      await html2pdfLib().set(opt).from(clone).save();
      document.body.removeChild(wrapper);
    } catch (err) {
      console.warn("Direct PDF generation fallback to print-to-PDF:", err);
      // Fallback: trigger print dialog where user can select "Save as PDF"
      handlePrint();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Export full ledger to Excel (.xlsx)
  const handleExportExcel = () => {
    if (!selectedCustomer) return;
    const rows = ledgerEntries.map(e => ({
      "Date": e.date,
      "Voucher / Doc #": e.docNumber,
      "Category": e.category,
      "Particulars / Details": e.particulars,
      "Debit (Invoiced ₹)": e.debit || 0,
      "Credit (Received ₹)": e.credit || 0,
      "Running Balance (₹)": e.balance
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ledger Statement");
    const safeName = selectedCustomer.name.replace(/[^a-zA-Z0-9]/g, "_");
    XLSX.writeFile(wb, `${safeName}_Ledger.xlsx`);
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
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs font-medium">
                    No customers found. Click &quot;Add Customer&quot; to register your first party.
                  </td>
                </tr>
              ) : (
                filtered.slice(0, 50).map((cust) => {
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
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Ledger Statement Drawer / Modal */}
      {selectedCustomer && (() => {
        const totalInvoiced = ledgerEntries.reduce((acc, e) => acc + (e.debit || 0), 0) + (selectedCustomer.opening_balance > 0 ? selectedCustomer.opening_balance : 0);
        const totalReceived = ledgerEntries.reduce((acc, e) => acc + (e.credit || 0), 0) + (selectedCustomer.opening_balance < 0 ? Math.abs(selectedCustomer.opening_balance) : 0);
        const netClosingBalance = (selectedCustomer.opening_balance || 0) + totalInvoiced - totalReceived;
        const isOutstanding = netClosingBalance > 0;

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto ledger-modal-overlay">
            <div className="bg-slate-100 rounded-2xl max-w-5xl w-full max-h-[94vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300 my-auto">
              {/* Modal Actions Bar (Top Toolbar) - Structured 2-Tier Header */}
              <div className="bg-slate-900 text-white shrink-0 no-print divide-y divide-slate-800">
                {/* Top Tier: Customer Details & Close */}
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shadow-xs shrink-0">
                      TPM
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-sm text-white tracking-tight flex items-center gap-2 truncate">
                        <span>Customer Account Ledger Statement</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-blue-300 font-mono font-normal shrink-0">
                          {selectedCustomer.code || "CUST-0001"}
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-300 font-medium truncate">
                        Party: <span className="font-bold text-white uppercase">{selectedCustomer.name}</span>
                        {selectedCustomer.phone && <span className="text-slate-400 ml-2">({selectedCustomer.phone})</span>}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(null)}
                    className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors shrink-0"
                    title="Close modal"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Bottom Tier: View Switcher (Left) & Actions (Right) */}
                <div className="px-4 py-2 bg-slate-950/40 flex flex-wrap items-center justify-between gap-2.5">
                  {/* View Tabs: Official Statement vs Bill Allocations */}
                  <div className="flex bg-slate-800 p-1 rounded-lg text-xs font-semibold border border-slate-700 shrink-0">
                    <button
                      type="button"
                      onClick={() => setLedgerTab("statement")}
                      className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                        ledgerTab === "statement" ? "bg-blue-600 text-white shadow-2xs" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <Receipt className="w-3.5 h-3.5" />
                      <span>Official Statement</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setLedgerTab("allocations")}
                      className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                        ledgerTab === "allocations" ? "bg-emerald-600 text-white shadow-2xs" : "text-slate-300 hover:text-white"
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Bill Allocations</span>
                      {unallocatedPayments.length > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950">
                          {unallocatedPayments.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Action Buttons: Print, PDF, Excel */}
                  {ledgerTab === "statement" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={handlePrint}
                        title="Print official statement on A4"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/20 transition-colors shadow-xs"
                      >
                        <Printer className="w-3.5 h-3.5 text-blue-300" />
                        <span>Print Statement</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPDF}
                        title="Download statement as high-resolution PDF"
                        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
                      >
                        {isGeneratingPDF ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>{isGeneratingPDF ? "Generating PDF..." : "Download as PDF"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleExportExcel}
                        title="Export full ledger journal to Excel spreadsheet (.xlsx)"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors shadow-xs"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Excel</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Scrollable Document & Allocation Area */}
              <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-200/60 flex flex-col items-center">
                {ledgerTab === "statement" ? (
                  <>
                    {/* Unallocated Payments Notice Banner on Statement view */}
                    {totalCustomerUnallocated > 0.005 && (
                      <div className="mb-3 max-w-[740px] w-full p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs no-print">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                          <div className="text-xs">
                            <span className="font-bold text-amber-950">Unallocated Payment Credit: </span>
                            <span className="font-extrabold text-emerald-700">{formatCurrency(totalCustomerUnallocated)}</span>
                            <span className="text-slate-500 ml-1">
                              ({unallocatedPayments.length} receipt{unallocatedPayments.length > 1 ? "s" : ""})
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (unallocatedPayments.length > 0) {
                              setAllocationPayment(unallocatedPayments[0]);
                              setShowAllocationModal(true);
                            } else {
                              setLedgerTab("allocations");
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-colors shadow-2xs shrink-0 flex items-center gap-1.5 justify-center"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Allocate to Bills</span>
                        </button>
                      </div>
                    )}

                    {/* Document Sheet Container: Fixed 740px width matched 100% to A4 page */}
                    <div
                      id="printable-ledger-doc"
                      style={{ width: "740px", minWidth: "740px", maxWidth: "740px" }}
                      className="bg-white text-slate-900 p-6 space-y-3.5 text-xs rounded-xl border border-slate-300 shadow-lg box-border font-sans"
                    >
                  {/* 1. Official Header / Business Letterhead */}
                  <div className="flex items-center justify-between pb-3 border-b-2 border-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#14243A] text-white font-black flex items-center justify-center text-base tracking-wider shrink-0 shadow-xs">
                        TPM
                      </div>
                      <div>
                        <h1 className="text-xl font-black text-slate-950 tracking-tight uppercase leading-tight">
                          {businessProfile.name}
                        </h1>
                        <p className="text-[11px] text-blue-900 font-bold uppercase tracking-wider">
                          Wholesale & Retail: Cement, TMT Steel Rods, Electricals & Hardware
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          {businessProfile.address} {businessProfile.phone ? `• Mob: ${businessProfile.phone}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="inline-block px-2.5 py-1 rounded bg-slate-100 border border-slate-300 font-mono font-bold text-slate-900 text-[11px] shadow-2xs">
                        GSTIN: {businessProfile.gstin}
                      </span>
                      <div className="text-[10px] text-slate-500 mt-0.5 font-medium">
                        Email: {businessProfile.email}
                      </div>
                    </div>
                  </div>

                  {/* 2. Statement Title Bar */}
                  <div className="bg-[#14243A] text-white px-3.5 py-1.5 rounded-lg flex items-center justify-between shadow-xs">
                    <div>
                      <h2 className="font-bold text-xs uppercase tracking-wider text-blue-200">
                        Statement of Account & Customer Running Ledger
                      </h2>
                      <p className="text-[9px] text-slate-300">
                        Chronological journal of posted bills, payments, and credit notes
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-slate-400 text-[10px]">Statement Date: </span>
                      <span className="font-bold text-white text-[11px]">{formatDate(new Date().toISOString())}</span>
                    </div>
                  </div>

                  {/* 3. Customer Info & Summary Box */}
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    {/* Left: Customer Info */}
                    <div className="space-y-0.5">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                        Account / Customer Details
                      </div>
                      <div className="text-sm font-black text-slate-950 uppercase leading-tight">
                        {selectedCustomer.name}
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-2 pt-0.5">
                        <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200 text-[9px]">
                          {selectedCustomer.code || "CUST-0001"}
                        </span>
                        {selectedCustomer.phone && <span className="font-semibold text-slate-700">📞 {selectedCustomer.phone}</span>}
                      </div>
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{selectedCustomer.address || "Bhubaneswar / Khordha, Odisha"}</span>
                      </div>
                    </div>

                    {/* Right: Balance Overview Box */}
                    <div className="grid grid-cols-3 gap-1.5 text-center p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                      <div className="p-1 border-r border-slate-100 flex flex-col justify-center">
                        <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-tight">Total Invoiced</div>
                        <div className="text-xs font-black text-slate-900 mt-0.5">
                          {formatCurrency(totalInvoiced)}
                        </div>
                        <div className="text-[8px] text-slate-400 font-medium">Debits (+)</div>
                      </div>
                      <div className="p-1 border-r border-slate-100 flex flex-col justify-center">
                        <div className="text-[9px] font-semibold text-slate-500 uppercase tracking-tight">Total Received</div>
                        <div className="text-xs font-black text-emerald-700 mt-0.5">
                          {formatCurrency(totalReceived)}
                        </div>
                        <div className="text-[8px] text-emerald-600 font-semibold">Credits (-)</div>
                      </div>
                      <div className={`p-1 rounded-md flex flex-col justify-center ${isOutstanding ? "bg-rose-50 border border-rose-200" : "bg-emerald-50 border border-emerald-200"}`}>
                        <div className="text-[9px] font-bold uppercase tracking-tight text-slate-600">Net Due</div>
                        <div className={`text-xs font-black mt-0.5 ${isOutstanding ? "text-rose-600" : "text-emerald-700"}`}>
                          {formatCurrency(Math.abs(netClosingBalance))}
                        </div>
                        <div className="text-[8px] font-bold text-slate-500 uppercase">
                          {netClosingBalance > 0 ? "Dr (Due)" : netClosingBalance < 0 ? "Cr (Adv)" : "Cleared"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 4. Chronological Ledger Table with Fixed Column Widths */}
                  <div className="border border-slate-300 rounded-xl overflow-hidden shadow-2xs">
                    <table className="w-full table-fixed text-left text-[11px] border-collapse">
                      <colgroup>
                        <col style={{ width: "68px" }} />
                        <col style={{ width: "96px" }} />
                        <col style={{ width: "200px" }} />
                        <col style={{ width: "52px" }} />
                        <col style={{ width: "82px" }} />
                        <col style={{ width: "82px" }} />
                        <col style={{ width: "110px" }} />
                      </colgroup>
                      <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300 text-[10px] uppercase">
                        <tr>
                          <th className="py-2.5 px-2">Date</th>
                          <th className="py-2.5 px-2">Doc #</th>
                          <th className="py-2.5 px-2">Particulars / Description</th>
                          <th className="py-2.5 px-1 text-center">Type</th>
                          <th className="py-2.5 px-2 text-right">Debit (₹)</th>
                          <th className="py-2.5 px-2 text-right">Credit (₹)</th>
                          <th className="py-2.5 px-2.5 text-right">Balance (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        {/* Opening Balance Row if present */}
                        {selectedCustomer.opening_balance !== 0 && (
                          <tr className="bg-slate-50/70 italic text-[10px]">
                            <td className="py-2 px-2 font-mono text-slate-500">—</td>
                            <td className="py-2 px-2 font-mono text-slate-500 truncate">OB-001</td>
                            <td className="py-2 px-2 font-semibold text-slate-800 truncate">Opening Balance Brought Forward</td>
                            <td className="py-2 px-1 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[8px] bg-slate-200 text-slate-700 font-bold font-mono">OP</span>
                            </td>
                            <td className="py-2 px-2 text-right font-mono whitespace-nowrap">
                              {selectedCustomer.opening_balance > 0 ? formatCurrency(selectedCustomer.opening_balance) : "—"}
                            </td>
                            <td className="py-2 px-2 text-right font-mono whitespace-nowrap">
                              {selectedCustomer.opening_balance < 0 ? formatCurrency(Math.abs(selectedCustomer.opening_balance)) : "—"}
                            </td>
                            <td className="py-2 px-2.5 text-right font-bold font-mono text-slate-900 whitespace-nowrap">
                              <span>{formatCurrency(Math.abs(selectedCustomer.opening_balance))}</span>
                              <span className={`ml-1 text-[9px] font-black ${selectedCustomer.opening_balance > 0 ? "text-rose-700" : "text-emerald-700"}`}>
                                {selectedCustomer.opening_balance > 0 ? "Dr" : "Cr"}
                              </span>
                            </td>
                          </tr>
                        )}

                        {ledgerEntries.length === 0 && selectedCustomer.opening_balance === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-6 text-center text-slate-400 font-medium">
                              No transactions recorded for this customer yet.
                            </td>
                          </tr>
                        ) : (
                          ledgerEntries.map((e) => (
                            <tr key={e.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2 px-2 font-mono text-slate-600 whitespace-nowrap text-[10px] truncate">
                                {e.date}
                              </td>
                              <td className="py-2 px-2 font-mono font-bold text-slate-900 whitespace-nowrap text-[10px] truncate" title={e.docNumber}>
                                {e.docNumber}
                              </td>
                              <td className="py-2 px-2 text-[10px] leading-tight">
                                <div className="font-semibold text-slate-900 break-words line-clamp-2">{e.particulars}</div>
                              </td>
                              <td className="py-2 px-1 text-center">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold inline-block ${
                                  e.type === "BILL"
                                    ? "bg-blue-100 text-blue-800"
                                    : e.type === "PAYMENT"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-purple-100 text-purple-800"
                                }`}>
                                  {e.category}
                                </span>
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-semibold text-slate-900 text-[10px] whitespace-nowrap">
                                {e.debit > 0 ? formatCurrency(e.debit) : "—"}
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-semibold text-emerald-700 text-[10px] whitespace-nowrap">
                                {e.credit > 0 ? formatCurrency(e.credit) : "—"}
                              </td>
                              <td className="py-2 px-2.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap text-[10px]">
                                <span>{formatCurrency(Math.abs(e.balance))}</span>
                                <span className={`ml-1 text-[9px] font-black ${e.balance > 0 ? "text-rose-700" : e.balance < 0 ? "text-emerald-700" : "text-slate-400"}`}>
                                  {e.balance > 0 ? "Dr" : e.balance < 0 ? "Cr" : ""}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                      <tfoot className="bg-slate-100 border-t-2 border-slate-300 font-bold text-slate-900 text-[11px]">
                        <tr>
                          <td colSpan={4} className="py-2.5 px-2.5 text-right uppercase tracking-wider text-[10px]">
                            Period Total:
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-black text-slate-950 whitespace-nowrap text-[10px]">
                            {formatCurrency(totalInvoiced)}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono font-black text-emerald-700 whitespace-nowrap text-[10px]">
                            {formatCurrency(totalReceived)}
                          </td>
                          <td className="py-2.5 px-2.5 text-right font-mono font-black whitespace-nowrap text-[10px]">
                            <span className={isOutstanding ? "text-rose-600" : "text-emerald-700"}>
                              {formatCurrency(Math.abs(netClosingBalance))}
                            </span>
                            <span className={`ml-1 text-[9px] font-black ${isOutstanding ? "text-rose-700" : "text-emerald-700"}`}>
                              {netClosingBalance > 0 ? "Dr" : netClosingBalance < 0 ? "Cr" : ""}
                            </span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* 5. Terms & Signatures Box */}
                  <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-200">
                    <div className="space-y-1 text-[9px] text-slate-500">
                      <div className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                        Terms & Conditions:
                      </div>
                      <p>1. Please verify statement entries and report any discrepancy within 7 days.</p>
                      <p>2. Overdue balances are subject to agreed commercial credit terms.</p>
                      <p>3. This extract represents active reconciled entries in TPM Business ERP.</p>
                      <div className="pt-5">
                        <div className="border-t border-slate-300 w-44 pt-1 text-[9px] font-semibold text-slate-600">
                          Customer Signature / Seal
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-end text-right">
                      <div>
                        <div className="font-black text-slate-900 text-[11px] uppercase">
                          For The Pramod Maharaj Enterprises
                        </div>
                        <div className="text-[9px] text-slate-500 font-medium">
                          Authorized Signatory / Accounts Desk
                        </div>
                      </div>
                      <div className="border-t border-slate-300 w-44 pt-1 text-center">
                        <span className="text-[9px] text-slate-400 font-medium">[ Signature & Stamp ]</span>
                      </div>
                    </div>
                  </div>

                  {/* 6. System Footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[8px] text-slate-400 font-medium">
                    <span>TPM Business ERP • System Verified Ledger Extract</span>
                    <span>Computer Generated Document • Reconciled from live storage records</span>
                  </div>
                </div>
                </>
              ) : (
                /* Dedicated Allocations & Outstanding Bills Management View (Requirement 1, 2, 3, 4, 11, 12) */
                <div className="max-w-4xl w-full space-y-4 text-xs pb-6">
                  {/* Summary Metric Header */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Total Invoiced</div>
                      <div className="text-base font-bold text-slate-900 mt-0.5">{formatCurrency(totalInvoiced)}</div>
                      <div className="text-[10px] text-slate-400">Debits (+)</div>
                    </div>
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <div className="text-[10px] font-bold uppercase text-slate-400">Total Received</div>
                      <div className="text-base font-bold text-emerald-700 mt-0.5">{formatCurrency(totalReceived)}</div>
                      <div className="text-[10px] text-slate-400">Credits (−)</div>
                    </div>
                    <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-2xs">
                      <div className="text-[10px] font-bold uppercase text-emerald-800">Unallocated Credit</div>
                      <div className="text-base font-extrabold text-emerald-700 mt-0.5">{formatCurrency(totalCustomerUnallocated)}</div>
                      <div className="text-[10px] text-emerald-600 font-medium">{unallocatedPayments.length} receipt{unallocatedPayments.length !== 1 ? "s" : ""} available</div>
                    </div>
                    <div className={`p-3 rounded-xl border shadow-2xs ${isOutstanding ? "bg-rose-50 border-rose-200" : "bg-emerald-50 border-emerald-200"}`}>
                      <div className="text-[10px] font-bold uppercase text-slate-600">Net Balance</div>
                      <div className={`text-base font-extrabold mt-0.5 ${isOutstanding ? "text-rose-600" : "text-emerald-700"}`}>
                        {formatCurrency(Math.abs(netClosingBalance))}
                      </div>
                      <div className="text-[10px] font-bold uppercase text-slate-500">
                        {netClosingBalance > 0 ? "Dr (Due / Receivable)" : netClosingBalance < 0 ? "Cr (Advance)" : "Cleared"}
                      </div>
                    </div>
                  </div>

                  {/* 1. Unallocated Payments Section (Requirement 1, 2, 4) */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-emerald-600" />
                          <span>Unallocated Customer Payment Receipts ({unallocatedPayments.length})</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Payments received with unallocated funds available to link to outstanding bills.
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Available Credit: {formatCurrency(totalCustomerUnallocated)}
                      </span>
                    </div>

                    {unallocatedPayments.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 font-medium space-y-1">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                        <p className="text-xs font-semibold text-slate-700">No Unallocated Payment Credits</p>
                        <p className="text-[11px] text-slate-400">All payment receipts for this customer have been completely allocated.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[620px]">
                          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Receipt No</th>
                              <th className="py-2.5 px-3">Customer / Party</th>
                              <th className="py-2.5 px-2">Mode</th>
                              <th className="py-2.5 px-2">Reference</th>
                              <th className="py-2.5 px-3 text-right">Total (₹)</th>
                              <th className="py-2.5 px-3 text-right">Allocated (₹)</th>
                              <th className="py-2.5 px-3 text-right">Unallocated Credit (₹)</th>
                              <th className="py-2.5 px-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {unallocatedPayments.map((p) => {
                              const allocated = (p.allocations || []).reduce((s, a) => s + (a.allocated_amount || 0), 0);
                              const unallocated = Math.max(0, (p.amount || 0) - allocated);

                              return (
                                <tr key={p.id} className="hover:bg-slate-50/70">
                                  <td className="py-2.5 px-3 font-mono text-slate-600">{formatDate(p.payment_date)}</td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{p.receipt_number}</td>
                                  <td className="py-2.5 px-3 font-bold text-slate-900">{p.customer_name}</td>
                                  <td className="py-2.5 px-2">
                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-800">
                                      {p.payment_mode}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-2 font-mono text-slate-500">{p.reference_number || "—"}</td>
                                  <td className="py-2.5 px-3 text-right font-semibold text-slate-800">{formatCurrency(p.amount)}</td>
                                  <td className="py-2.5 px-3 text-right font-semibold text-purple-700">{formatCurrency(allocated)}</td>
                                  <td className="py-2.5 px-3 text-right font-black text-emerald-700 text-sm">{formatCurrency(unallocated)}</td>
                                  <td className="py-2.5 px-3 text-center">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setAllocationPayment(p);
                                        setShowAllocationModal(true);
                                      }}
                                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-colors"
                                    >
                                      <CreditCard className="w-3.5 h-3.5" />
                                      <span>Allocate Payment</span>
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 2. Customer Outstanding Bills (Requirement 3) */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <Receipt className="w-4 h-4 text-blue-600" />
                          <span>Customer Outstanding Bills ({customerOutstandingBills.length})</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Unpaid and partially paid bills requiring payment allocation.
                        </p>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Remaining Dues: {formatCurrency(customerOutstandingBills.reduce((s, b) => s + b.remaining_balance, 0))}
                      </span>
                    </div>

                    {customerOutstandingBills.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 font-medium space-y-1">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 mx-auto" />
                        <p className="text-xs font-semibold text-slate-700">No Outstanding Bills</p>
                        <p className="text-[11px] text-slate-400">All bills for this customer have been completely cleared.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[580px]">
                          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">Bill No</th>
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-2">Category</th>
                              <th className="py-2.5 px-3 text-right">Total Bill (₹)</th>
                              <th className="py-2.5 px-3 text-right">Settled Amount (₹)</th>
                              <th className="py-2.5 px-3 text-right">Remaining Balance (₹)</th>
                              <th className="py-2.5 px-3 text-center">Status</th>
                              <th className="py-2.5 px-3 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {customerOutstandingBills.map((b) => (
                              <tr key={b.id} className="hover:bg-slate-50/70">
                                <td className="py-2.5 px-3 font-bold text-blue-700">Bill #{b.bill_number}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-500">{formatDate(b.bill_date)}</td>
                                <td className="py-2.5 px-2">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    b.bill_category === "cement" ? "bg-emerald-100 text-emerald-800" :
                                    b.bill_category === "rod" ? "bg-amber-100 text-amber-800" :
                                    "bg-blue-100 text-blue-800"
                                  }`}>
                                    {b.bill_category}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-medium text-slate-700">{formatCurrency(b.total_amount)}</td>
                                <td className="py-2.5 px-3 text-right font-medium text-emerald-700">{formatCurrency(b.total_settled_amount)}</td>
                                <td className="py-2.5 px-3 text-right font-bold text-rose-600 text-sm">{formatCurrency(b.remaining_balance)}</td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                    b.payment_status === "paid" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                                    b.payment_status === "partially_paid" ? "bg-amber-50 text-amber-700 border-amber-200" :
                                    "bg-rose-50 text-rose-700 border-rose-200"
                                  }`}>
                                    {b.payment_status === "paid" ? "Paid" : b.payment_status === "partially_paid" ? "Partially Paid" : "Unpaid"}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (unallocatedPayments.length > 0) {
                                        setAllocationPayment(unallocatedPayments[0]);
                                        setShowAllocationModal(true);
                                      } else {
                                        alert("No unallocated payment receipts available. Please record a payment receipt first.");
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-bold text-[11px] transition-colors"
                                  >
                                    <Layers className="w-3 h-3 text-blue-600" />
                                    <span>Allocate</span>
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* 3. Payment Allocation Journal & Audit Trail (Requirement 11, 12) */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <History className="w-4 h-4 text-purple-600" />
                          <span>Payment Allocation Journal & Audit Trail ({customerAllocationsHistory.length})</span>
                        </h4>
                        <p className="text-[11px] text-slate-500">
                          Complete history of payment-to-bill linkages with authorized reversal capability.
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-500">
                        Role: <strong className="uppercase text-slate-800">{userRole}</strong> (Owner / Manager can reverse)
                      </span>
                    </div>

                    {customerAllocationsHistory.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 font-medium">
                        No payment allocations have been linked for this customer yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs min-w-[620px]">
                          <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-2.5 px-3">Date Linked</th>
                              <th className="py-2.5 px-3">Payment Receipt</th>
                              <th className="py-2.5 px-3">Allocated to Bill</th>
                              <th className="py-2.5 px-3 text-right">Allocated Amount (₹)</th>
                              <th className="py-2.5 px-3">Authorized By</th>
                              <th className="py-2.5 px-3">Notes</th>
                              <th className="py-2.5 px-3 text-center">Reversal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-800">
                            {customerAllocationsHistory.map((item) => (
                              <tr key={item.allocationId} className="hover:bg-slate-50/70">
                                <td className="py-2.5 px-3 font-mono text-slate-500">{formatDate(item.allocatedAt)}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-emerald-700">{item.receiptNumber}</td>
                                <td className="py-2.5 px-3 font-bold text-blue-700">Bill #{item.billNumber}</td>
                                <td className="py-2.5 px-3 text-right font-black text-slate-900">{formatCurrency(item.allocatedAmount)}</td>
                                <td className="py-2.5 px-3 text-slate-600 font-medium">{item.allocatedBy || "Pramod Maharaj (Owner)"}</td>
                                <td className="py-2.5 px-3 text-slate-500 italic">{item.notes || "—"}</td>
                                <td className="py-2.5 px-3 text-center">
                                  {userRole === "owner" || userRole === "manager" ? (
                                    reversingAllocId === item.allocationId ? (
                                      <div className="flex items-center justify-center gap-1 animate-in fade-in">
                                        <input
                                          type="text"
                                          value={reversalReasonInput}
                                          onChange={(e) => setReversalReasonInput(e.target.value)}
                                          placeholder="Reason..."
                                          className="px-1.5 py-0.5 text-[10px] rounded border border-rose-300 w-20 focus:outline-none"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleReverseAllocationFromLedger(item.paymentId, item.allocationId)}
                                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] transition-colors"
                                        >
                                          Confirm
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setReversingAllocId(null)}
                                          className="px-1 py-0.5 text-slate-400 hover:text-slate-700 text-[10px]"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setReversingAllocId(item.allocationId);
                                          setReversalReasonInput("");
                                        }}
                                        title="Reverse this allocation and restore payment credit"
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition-colors text-[10px]"
                                      >
                                        <RotateCcw className="w-3 h-3 text-rose-600" />
                                        <span>Reverse</span>
                                      </button>
                                    )
                                  ) : (
                                    <span className="text-[10px] text-slate-400">Protected</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Payment Allocation Modal */}
      {showAllocationModal && (
        <PaymentAllocationModal
          isOpen={showAllocationModal}
          onClose={() => {
            setShowAllocationModal(false);
            setAllocationPayment(null);
          }}
          payment={allocationPayment}
          onSuccess={() => {
            loadCustomers();
          }}
        />
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
