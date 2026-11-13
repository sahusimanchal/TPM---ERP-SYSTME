"use client";

import { useState, useEffect, useMemo } from "react";
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  CreditCard, 
  Receipt, 
  ArrowRight, 
  History, 
  RotateCcw, 
  ShieldCheck, 
  Lock,
  Sparkles,
  Layers,
  Check
} from "lucide-react";
import { 
  Payment, 
  Bill, 
  PaymentAllocation, 
  UserRole 
} from "@/lib/types";
import { 
  formatCurrency, 
  formatDate 
} from "@/lib/utils";
import { 
  getCustomerOutstandingBills, 
  allocatePaymentToBills, 
  reversePaymentAllocation,
  getStoredUserRole,
  BillSettlementInfo
} from "@/lib/storage";

interface PaymentAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  payment: Payment | null;
  onSuccess?: () => void;
}

export default function PaymentAllocationModal({
  isOpen,
  onClose,
  payment,
  onSuccess
}: PaymentAllocationModalProps) {
  const [role, setRole] = useState<UserRole>("owner");
  const [outstandingBills, setOutstandingBills] = useState<(Bill & BillSettlementInfo)[]>([]);
  const [allocAmounts, setAllocAmounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [reversingId, setReversingId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");

  useEffect(() => {
    if (isOpen) {
      setRole(getStoredUserRole());
      setErrorMsg(null);
      setSuccessMsg(null);
      setAllocAmounts({});
      setNotes("");
      setShowHistory(false);
      setReversingId(null);
      setReversalReason("");

      if (payment) {
        const bills = getCustomerOutstandingBills(payment.customer_id || payment.customer_name);
        setOutstandingBills(bills);
      }
    }
  }, [isOpen, payment]);

  if (!isOpen || !payment) return null;

  const isAuthorized = role === "owner" || role === "manager";

  // Available unallocated credit on this receipt
  const totalAllocatedSoFar = (payment.allocations || []).reduce(
    (sum, a) => sum + (a.allocated_amount || 0), 
    0
  );
  const availableUnallocated = Math.max(0, payment.amount - totalAllocatedSoFar);

  // Sum of currently entered allocation inputs
  const totalEnteredAllocation = Object.values(allocAmounts).reduce(
    (sum, val) => sum + (parseFloat(val) || 0), 
    0
  );

  const remainingAfterAllocation = Math.max(0, availableUnallocated - totalEnteredAllocation);
  const isOverAllocated = totalEnteredAllocation > availableUnallocated + 0.005;

  const handleInputChange = (billId: string, val: string, maxBillRemaining: number) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    if (val === "") {
      const copy = { ...allocAmounts };
      delete copy[billId];
      setAllocAmounts(copy);
      return;
    }

    const num = parseFloat(val);
    if (isNaN(num) || num < 0) return;

    setAllocAmounts(prev => ({
      ...prev,
      [billId]: val
    }));
  };

  const handleQuickFill = (billId: string, billRemainingDue: number) => {
    // Current allocation for this bill
    const currentForThis = parseFloat(allocAmounts[billId]) || 0;
    // Current allocations for other bills
    const otherAllocated = totalEnteredAllocation - currentForThis;
    // How much unallocated credit is left in the payment
    const creditAvailableForThis = Math.max(0, availableUnallocated - otherAllocated);
    // Fill minimum of credit available and bill remaining due
    const fillAmount = Math.min(creditAvailableForThis, billRemainingDue);

    if (fillAmount <= 0) {
      setErrorMsg("No remaining payment credit available to allocate to this bill.");
      return;
    }

    setAllocAmounts(prev => ({
      ...prev,
      [billId]: fillAmount.toFixed(2)
    }));
  };

  const handleClearBill = (billId: string) => {
    const copy = { ...allocAmounts };
    delete copy[billId];
    setAllocAmounts(copy);
  };

  const handleAutoAllocateFifo = () => {
    // Automatically allocates the unallocated credit across outstanding bills in chronological order (FIFO)
    let creditRemaining = availableUnallocated;
    const newAmounts: Record<string, string> = {};

    for (const b of outstandingBills) {
      if (creditRemaining <= 0.005) break;
      const allocateForBill = Math.min(creditRemaining, b.remaining_balance);
      if (allocateForBill > 0.005) {
        newAmounts[b.id] = allocateForBill.toFixed(2);
        creditRemaining -= allocateForBill;
      }
    }

    setAllocAmounts(newAmounts);
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!isAuthorized) {
      setErrorMsg("Permission denied: Only Owner or Manager role can allocate payments.");
      return;
    }

    if (totalEnteredAllocation <= 0.005) {
      setErrorMsg("Please enter an amount to allocate to at least one bill.");
      return;
    }

    if (isOverAllocated) {
      setErrorMsg(
        `Total allocation (${formatCurrency(totalEnteredAllocation)}) exceeds available payment unallocated credit (${formatCurrency(availableUnallocated)}).`
      );
      return;
    }

    // Verify per-bill remaining bounds
    for (const [billId, val] of Object.entries(allocAmounts)) {
      const amt = parseFloat(val) || 0;
      if (amt <= 0) continue;
      const b = outstandingBills.find(item => item.id === billId);
      if (b && amt > b.remaining_balance + 0.005) {
        setErrorMsg(
          `Allocation ${formatCurrency(amt)} exceeds remaining balance on Bill #${b.bill_number} (${formatCurrency(b.remaining_balance)}).`
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const items = Object.entries(allocAmounts)
        .map(([billId, val]) => ({
          bill_id: billId,
          allocated_amount: parseFloat(val) || 0
        }))
        .filter(item => item.allocated_amount > 0.005);

      const res = allocatePaymentToBills({
        payment_id: payment.id,
        allocations: items,
        notes: notes.trim() || undefined
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to allocate payment.");
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`Successfully allocated ${formatCurrency(res.allocated_total)} to bills!`);
      setAllocAmounts({});
      setNotes("");

      // Refresh outstanding bills list
      const updatedBills = getCustomerOutstandingBills(payment.customer_id || payment.customer_name);
      setOutstandingBills(updatedBills);

      if (onSuccess) onSuccess();
      
      // Auto close after brief display
      setTimeout(() => {
        onClose();
      }, 1400);
    } catch (err: any) {
      setErrorMsg(err?.message || "An unexpected error occurred during allocation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverseAllocation = (allocationId: string) => {
    if (!isAuthorized) {
      alert("Permission denied: Only Owner or Manager can reverse allocations.");
      return;
    }

    const res = reversePaymentAllocation({
      payment_id: payment.id,
      allocation_id: allocationId,
      reason: reversalReason.trim() || undefined
    });

    if (!res.success) {
      alert(res.error || "Failed to reverse allocation.");
      return;
    }

    setReversingId(null);
    setReversalReason("");
    setSuccessMsg("Allocation successfully reversed. Funds restored to unallocated credit.");

    // Refresh bills
    const updatedBills = getCustomerOutstandingBills(payment.customer_id || payment.customer_name);
    setOutstandingBills(updatedBills);

    if (onSuccess) onSuccess();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-[#14243A] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white tracking-tight flex items-center gap-2">
                <span>Allocate Customer Payment to Outstanding Bills</span>
              </h3>
              <p className="text-xs text-blue-200">
                Party: <span className="font-bold text-white uppercase">{payment.customer_name}</span> • Receipt #{payment.receipt_number}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* Notification Messages */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="font-semibold text-xs">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span className="font-semibold text-xs">{successMsg}</span>
            </div>
          )}

          {/* Role Access Banner */}
          {!isAuthorized && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="text-xs font-semibold">
                View Only: You are logged in as <span className="uppercase font-bold">{role}</span>. Only Owner or Manager role can link or reverse payment allocations.
              </span>
            </div>
          )}

          {/* Payment Receipt Summary Card (Requirement 2) */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-sm">{payment.receipt_number}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 uppercase">
                  {payment.payment_mode}
                </span>
                {payment.reference_number && (
                  <span className="text-[11px] text-slate-500 font-mono">
                    Ref: {payment.reference_number}
                  </span>
                )}
              </div>
              <span className="text-slate-500 text-xs">
                Payment Date: <strong className="text-slate-800">{formatDate(payment.payment_date)}</strong>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Total Receipt</div>
                <div className="text-base font-extrabold text-slate-900 mt-0.5">
                  {formatCurrency(payment.amount)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Already Allocated</div>
                <div className="text-base font-extrabold text-purple-700 mt-0.5">
                  {formatCurrency(totalAllocatedSoFar)}
                </div>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Available to Allocate</div>
                <div className="text-base font-extrabold text-emerald-700 mt-0.5">
                  {formatCurrency(availableUnallocated)}
                </div>
              </div>
            </div>

            {/* Toggle Allocation History if exists */}
            {(payment.allocations || []).length > 0 && (
              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>
                    {showHistory ? "Hide Past Allocations" : `View ${payment.allocations.length} Existing Allocation(s)`}
                  </span>
                </button>
                <span className="text-[11px] text-slate-400">
                  Allocated funds reduce specific bill balances.
                </span>
              </div>
            )}
          </div>

          {/* Allocation History List & Reversal Section (Requirement 11, 12) */}
          {showHistory && (payment.allocations || []).length > 0 && (
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="font-bold text-purple-950 text-xs flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-purple-700" />
                  <span>Allocation History for Receipt #{payment.receipt_number}</span>
                </div>
                <span className="text-[10px] text-purple-700 font-semibold">
                  Authorized Reversals Enabled
                </span>
              </div>

              <div className="divide-y divide-purple-100 bg-white rounded-lg border border-purple-200 overflow-hidden text-xs">
                {payment.allocations.map((alloc) => (
                  <div key={alloc.id} className="p-2.5 flex items-center justify-between gap-2 hover:bg-slate-50">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-700">Bill #{alloc.bill_number}</span>
                        <span className="text-[10px] font-bold text-slate-500">
                          {formatDate(alloc.created_at)}
                        </span>
                        {alloc.allocated_by && (
                          <span className="text-[10px] text-slate-400">
                            by {alloc.allocated_by}
                          </span>
                        )}
                      </div>
                      {alloc.notes && (
                        <div className="text-[11px] text-slate-500 italic mt-0.5">{alloc.notes}</div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-bold text-slate-900">
                        {formatCurrency(alloc.allocated_amount)}
                      </span>

                      {isAuthorized && (
                        reversingId === alloc.id ? (
                          <div className="flex items-center gap-1.5 animate-in fade-in">
                            <input
                              type="text"
                              value={reversalReason}
                              onChange={(e) => setReversalReason(e.target.value)}
                              placeholder="Reason (optional)..."
                              className="px-2 py-1 text-[11px] rounded border border-rose-300 w-32 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleReverseAllocation(alloc.id)}
                              className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-bold text-[10px] transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setReversingId(null)}
                              className="px-1.5 py-1 text-slate-500 hover:text-slate-800 text-[10px]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setReversingId(alloc.id);
                              setReversalReason("");
                            }}
                            title="Reverse this allocation and restore credit"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold border border-rose-200 transition-colors text-[10px]"
                          >
                            <RotateCcw className="w-3 h-3 text-rose-600" />
                            <span>Reverse</span>
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customer Outstanding Bills Table (Requirement 3, 5, 6, 7, 8) */}
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-slate-900 text-xs sm:text-sm flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <span>Customer Outstanding Bills ({outstandingBills.length})</span>
                </h4>
                <p className="text-[11px] text-slate-500">
                  Select and enter full or partial payment amount for each bill.
                </p>
              </div>

              {availableUnallocated > 0.005 && outstandingBills.length > 0 && isAuthorized && (
                <button
                  type="button"
                  onClick={handleAutoAllocateFifo}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors shadow-2xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>Auto-Allocate (Oldest First)</span>
                </button>
              )}
            </div>

            {outstandingBills.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 space-y-1">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto" />
                <p className="font-bold text-slate-800 text-xs">All Bills Are Fully Cleared</p>
                <p className="text-slate-500 text-[11px]">
                  This customer has no unpaid or partially paid bills. Any unallocated payment amount acts as a credit/advance balance on the ledger.
                </p>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[580px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Bill Details</th>
                        <th className="py-2.5 px-2 text-right">Total (₹)</th>
                        <th className="py-2.5 px-2 text-right">Already Paid</th>
                        <th className="py-2.5 px-2 text-right">Remaining Due</th>
                        <th className="py-2.5 px-3 text-right w-44">Allocate Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {outstandingBills.map((b) => {
                        const enteredVal = allocAmounts[b.id] || "";
                        const numVal = parseFloat(enteredVal) || 0;
                        const willBeCleared = Math.abs(b.remaining_balance - numVal) <= 0.005 && numVal > 0;
                        const isPartiallyFilled = numVal > 0 && numVal < b.remaining_balance - 0.005;

                        return (
                          <tr key={b.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-blue-700">Bill #{b.bill_number}</span>
                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                  b.bill_category === "cement" ? "bg-emerald-100 text-emerald-800" :
                                  b.bill_category === "rod" ? "bg-amber-100 text-amber-800" :
                                  "bg-blue-100 text-blue-800"
                                }`}>
                                  {b.bill_category}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Date: {formatDate(b.bill_date)}
                              </div>
                            </td>

                            <td className="py-2.5 px-2 text-right font-medium text-slate-600">
                              {formatCurrency(b.total_amount)}
                            </td>

                            <td className="py-2.5 px-2 text-right font-medium text-emerald-700">
                              {formatCurrency(b.total_settled_amount)}
                            </td>

                            <td className="py-2.5 px-2 text-right font-bold text-rose-600">
                              {formatCurrency(b.remaining_balance)}
                            </td>

                            <td className="py-2.5 px-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max={b.remaining_balance}
                                  disabled={!isAuthorized || availableUnallocated <= 0.005}
                                  value={enteredVal}
                                  onChange={(e) => handleInputChange(b.id, e.target.value, b.remaining_balance)}
                                  placeholder="0.00"
                                  className={`w-28 px-2 py-1 rounded-lg border text-right font-mono font-bold text-xs focus:outline-none focus:ring-2 ${
                                    numVal > b.remaining_balance + 0.005
                                      ? "border-rose-400 bg-rose-50 text-rose-700 focus:ring-rose-200"
                                      : numVal > 0
                                      ? "border-emerald-400 bg-emerald-50/50 text-emerald-900 focus:ring-emerald-200"
                                      : "border-slate-300 bg-white text-slate-800 focus:ring-blue-200"
                                  }`}
                                />

                                {isAuthorized && (
                                  numVal > 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => handleClearBill(b.id)}
                                      title="Clear allocation"
                                      className="px-1.5 py-1 text-[10px] text-slate-400 hover:text-rose-600 rounded"
                                    >
                                      ✕
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleQuickFill(b.id, b.remaining_balance)}
                                      title="Allocate full due (or max available)"
                                      disabled={availableUnallocated <= 0.005}
                                      className="px-1.5 py-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors disabled:opacity-40"
                                    >
                                      Full
                                    </button>
                                  )
                                )}
                              </div>

                              {/* Status hint */}
                              <div className="text-[9px] mt-0.5 text-right font-semibold">
                                {willBeCleared ? (
                                  <span className="text-emerald-600 flex items-center justify-end gap-0.5">
                                    <Check className="w-2.5 h-2.5" /> Will be marked Paid
                                  </span>
                                ) : isPartiallyFilled ? (
                                  <span className="text-amber-600">
                                    Partially Paid ({formatCurrency(b.remaining_balance - numVal)} remaining)
                                  </span>
                                ) : null}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Allocation Calculation & Impact Summary (Requirement 8, 10, 14) */}
          <div className="p-3.5 rounded-xl bg-slate-900 text-white space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-300">Total Selected for Allocation:</span>
              <span className={`text-base font-extrabold ${isOverAllocated ? "text-rose-400" : "text-emerald-400"}`}>
                {formatCurrency(totalEnteredAllocation)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-300 pt-1 border-t border-slate-800">
              <span>Remaining Unallocated Payment Credit:</span>
              <span className="font-bold text-white">
                {formatCurrency(remainingAfterAllocation)}
              </span>
            </div>

            {isOverAllocated && (
              <div className="text-[11px] text-rose-300 font-bold bg-rose-950/70 p-2 rounded-lg border border-rose-800 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  Allocation exceeds available payment credit by {formatCurrency(totalEnteredAllocation - availableUnallocated)}.
                </span>
              </div>
            )}
          </div>

          {/* Optional Notes */}
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-slate-700">
              Audit / Allocation Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Cleared SE001 against cash collection..."
              disabled={!isAuthorized}
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>Updates bill status and ledger without creating duplicate transactions.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold transition-colors text-xs"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!isAuthorized || isSubmitting || totalEnteredAllocation <= 0.005 || isOverAllocated}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-colors text-xs shadow-sm disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? "Allocating..." : "Confirm & Save Allocation"}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

