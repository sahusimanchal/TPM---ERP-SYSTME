"use client";

import { useState, useEffect } from "react";
import { 
  Package, 
  TrendingUp, 
  CreditCard, 
  Layers, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  Settings2
} from "lucide-react";
import { 
  CementBrand, 
  RodSize, 
  PaymentModeOption, 
  ExpenseCategoryOption,
  UserRole
} from "@/lib/types";
import {
  getCementBrands,
  addCementBrand,
  updateCementBrand,
  deleteCementBrand,
  getRodSizes,
  addRodSize,
  updateRodSize,
  deleteRodSize,
  getPaymentModes,
  addPaymentMode,
  updatePaymentMode,
  deletePaymentMode,
  getExpenseCategories,
  addExpenseCategory,
  updateExpenseCategory,
  deleteExpenseCategory
} from "@/lib/storage";
import { getClientSession } from "@/lib/auth";

interface Props {
  role: UserRole;
}

export default function MasterCatalogSettingsSection({ role }: Props) {
  const [activeTab, setActiveTab] = useState<"cement" | "rod" | "payment" | "expense">("cement");
  const [cementBrands, setCementBrands] = useState<CementBrand[]>([]);
  const [rodSizes, setRodSizes] = useState<RodSize[]>([]);
  const [paymentModes, setPaymentModes] = useState<PaymentModeOption[]>([]);
  const [expenseCats, setExpenseCats] = useState<ExpenseCategoryOption[]>([]);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Cement form
  const [newCementName, setNewCementName] = useState("");
  const [newCementRate, setNewCementRate] = useState("");
  const [newCementNotes, setNewCementNotes] = useState("");
  const [editingCementId, setEditingCementId] = useState<string | null>(null);
  const [editCementName, setEditCementName] = useState("");
  const [editCementRate, setEditCementRate] = useState("");
  const [editCementNotes, setEditCementNotes] = useState("");

  // Rod form
  const [newRodSize, setNewRodSize] = useState("");
  const [newRodRate, setNewRodRate] = useState("");
  const [newRodNotes, setNewRodNotes] = useState("");
  const [editingRodId, setEditingRodId] = useState<string | null>(null);
  const [editRodSize, setEditRodSize] = useState("");
  const [editRodRate, setEditRodRate] = useState("");
  const [editRodNotes, setEditRodNotes] = useState("");

  // Payment form
  const [newPayCode, setNewPayCode] = useState("");
  const [newPayLabel, setNewPayLabel] = useState("");

  // Expense form
  const [newExpName, setNewExpName] = useState("");

  const refreshAll = () => {
    setCementBrands(getCementBrands());
    setRodSizes(getRodSizes());
    setPaymentModes(getPaymentModes());
    setExpenseCats(getExpenseCategories());
  };

  useEffect(() => {
    refreshAll();
    window.addEventListener("tpm_data_updated", refreshAll);
    return () => window.removeEventListener("tpm_data_updated", refreshAll);
  }, []);

  const getActor = () => {
    const session = getClientSession();
    return session?.user?.fullName 
      ? `${session.user.fullName} (${session.user.role.toUpperCase()})`
      : "System Administrator (Admin Account)";
  };

  // Cement handlers
  const handleAddCement = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = addCementBrand({
      name: newCementName,
      defaultRate: parseFloat(newCementRate) || 0,
      notes: newCementNotes
    }, getActor());

    if (!res.success) {
      setErrorMsg(res.error || "Failed to add brand.");
      return;
    }

    setSuccessMsg(`Cement brand "${res.brand?.name}" successfully added!`);
    setNewCementName("");
    setNewCementRate("");
    setNewCementNotes("");
    refreshAll();
  };

  const handleSaveCementEdit = (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = updateCementBrand(id, {
      name: editCementName,
      defaultRate: parseFloat(editCementRate) || 0,
      notes: editCementNotes
    }, getActor());

    if (!res.success) {
      setErrorMsg(res.error || "Failed to update brand.");
      return;
    }

    setSuccessMsg(`Brand updated successfully.`);
    setEditingCementId(null);
    refreshAll();
  };

  const handleDeleteCement = (id: string, name: string) => {
    if (confirm(`Remove cement brand "${name}" from active catalog?`)) {
      const res = deleteCementBrand(id, getActor());
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete.");
      } else {
        setSuccessMsg(`Brand "${name}" removed from catalog.`);
        refreshAll();
      }
    }
  };

  // Rod handlers
  const handleAddRod = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = addRodSize({
      size: newRodSize,
      defaultRate: parseFloat(newRodRate) || 0,
      notes: newRodNotes
    }, getActor());

    if (!res.success) {
      setErrorMsg(res.error || "Failed to add rod size.");
      return;
    }

    setSuccessMsg(`Rod size "${res.size?.size}" added!`);
    setNewRodSize("");
    setNewRodRate("");
    setNewRodNotes("");
    refreshAll();
  };

  const handleSaveRodEdit = (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = updateRodSize(id, {
      size: editRodSize,
      defaultRate: parseFloat(editRodRate) || 0,
      notes: editRodNotes
    }, getActor());

    if (!res.success) {
      setErrorMsg(res.error || "Failed to update rod size.");
      return;
    }

    setSuccessMsg(`Rod size updated successfully.`);
    setEditingRodId(null);
    refreshAll();
  };

  const handleDeleteRod = (id: string, sizeName: string) => {
    if (confirm(`Remove rod specification "${sizeName}"?`)) {
      const res = deleteRodSize(id, getActor());
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete.");
      } else {
        setSuccessMsg(`Rod size "${sizeName}" removed.`);
        refreshAll();
      }
    }
  };

  // Payment mode handlers
  const handleAddPayMode = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = addPaymentMode({ code: newPayCode, label: newPayLabel }, getActor());
    if (!res.success) {
      setErrorMsg(res.error || "Failed to add payment mode.");
      return;
    }

    setSuccessMsg(`Payment channel "${res.mode?.code}" added.`);
    setNewPayCode("");
    setNewPayLabel("");
    refreshAll();
  };

  const handleDeletePayMode = (id: string, code: string) => {
    if (confirm(`Remove custom payment channel "${code}"?`)) {
      const res = deletePaymentMode(id, getActor());
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete.");
      } else {
        setSuccessMsg(`Payment channel "${code}" removed.`);
        refreshAll();
      }
    }
  };

  // Expense handlers
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = addExpenseCategory(newExpName, getActor());
    if (!res.success) {
      setErrorMsg(res.error || "Failed to add category.");
      return;
    }

    setSuccessMsg(`Expense category "${res.category?.name}" added.`);
    setNewExpName("");
    refreshAll();
  };

  const handleDeleteExpense = (id: string, name: string) => {
    if (confirm(`Remove expense category "${name}"?`)) {
      const res = deleteExpenseCategory(id, getActor());
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete.");
      } else {
        setSuccessMsg(`Expense category "${name}" removed.`);
        refreshAll();
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
      
      {/* Header */}
      <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
            <Settings2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                Master Data Catalogs & Business Configuration
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                Admin Control
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Add, edit, or remove Cement Brands, TMT Rod Sizes, Payment Channels, and Outflow Categories.
            </p>
          </div>
        </div>

        <span className="text-xs text-slate-400 self-start sm:self-auto font-mono">
          Single Source of Truth
        </span>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-slate-100/50 p-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => { setActiveTab("cement"); setErrorMsg(null); setSuccessMsg(null); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-colors ${
            activeTab === "cement"
              ? "bg-white text-emerald-800 shadow-2xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Package className="w-4 h-4 text-emerald-600" />
          <span>Cement Brands ({cementBrands.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("rod"); setErrorMsg(null); setSuccessMsg(null); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-colors ${
            activeTab === "rod"
              ? "bg-white text-amber-900 shadow-2xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <TrendingUp className="w-4 h-4 text-amber-600" />
          <span>TMT Steel Rod Sizes ({rodSizes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("payment"); setErrorMsg(null); setSuccessMsg(null); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-colors ${
            activeTab === "payment"
              ? "bg-white text-blue-900 shadow-2xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <CreditCard className="w-4 h-4 text-blue-600" />
          <span>Payment Channels ({paymentModes.length})</span>
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab("expense"); setErrorMsg(null); setSuccessMsg(null); }}
          className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold text-xs transition-colors ${
            activeTab === "expense"
              ? "bg-white text-rose-900 shadow-2xs border border-slate-200"
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Layers className="w-4 h-4 text-rose-600" />
          <span>Expense Categories ({expenseCats.length})</span>
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="m-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="m-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Tab Body */}
      <div className="p-5">
        
        {/* =================================================================== */}
        {/* TAB 1: CEMENT BRANDS                                                */}
        {/* =================================================================== */}
        {activeTab === "cement" && (
          <div className="space-y-5">
            {/* Add Brand Form */}
            <form onSubmit={handleAddCement} className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-3">
              <div className="font-bold text-xs text-emerald-950 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-emerald-700" />
                <span>Add New Cement Brand</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Brand Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ULTRATECH, DALMIA, ACC"
                    value={newCementName}
                    onChange={(e) => setNewCementName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Default Rate per Bag (₹)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    placeholder="e.g. 365"
                    value={newCementRate}
                    onChange={(e) => setNewCementRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Description / Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Weather Shield PPC"
                    value={newCementNotes}
                    onChange={(e) => setNewCementNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Brand</span>
                </button>
              </div>
            </form>

            {/* Brands Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
              {cementBrands.map((b) => {
                const isEditing = editingCementId === b.id;

                if (isEditing) {
                  return (
                    <div key={b.id} className="p-3 bg-blue-50/50 space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={editCementName}
                          onChange={(e) => setEditCementName(e.target.value)}
                          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white uppercase font-bold"
                          placeholder="Brand Name"
                        />
                        <input
                          type="number"
                          step="0.5"
                          value={editCementRate}
                          onChange={(e) => setEditCementRate(e.target.value)}
                          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white font-semibold"
                          placeholder="Default Rate"
                        />
                        <input
                          type="text"
                          value={editCementNotes}
                          onChange={(e) => setEditCementNotes(e.target.value)}
                          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                          placeholder="Notes"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingCementId(null)}
                          className="px-3 py-1 rounded text-slate-600 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveCementEdit(b.id)}
                          className="px-3 py-1 rounded bg-blue-600 text-white font-bold text-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={b.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => updateCementBrand(b.id, { isActive: !b.isActive }, getActor())}
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          b.isActive
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                        title={b.isActive ? "Active (Click to deactivate)" : "Inactive (Click to activate)"}
                      >
                        {b.isActive && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold uppercase tracking-tight text-sm ${b.isActive ? "text-slate-900" : "text-slate-400 line-through"}`}>
                            {b.name}
                          </span>
                          {!b.isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-500 font-semibold">
                              Inactive
                            </span>
                          )}
                        </div>
                        {b.notes && <p className="text-[11px] text-slate-500">{b.notes}</p>}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block uppercase font-semibold">Bag Rate</span>
                        <span className="font-bold text-emerald-800 text-sm">
                          {b.defaultRate ? `₹${b.defaultRate.toFixed(2)}` : "Manual"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCementId(b.id);
                            setEditCementName(b.name);
                            setEditCementRate(b.defaultRate ? String(b.defaultRate) : "");
                            setEditCementNotes(b.notes || "");
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Brand"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCement(b.id, b.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Remove Brand"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 2: ROD SIZES                                                    */}
        {/* =================================================================== */}
        {activeTab === "rod" && (
          <div className="space-y-5">
            <form onSubmit={handleAddRod} className="p-4 rounded-xl bg-amber-50/50 border border-amber-200 space-y-3">
              <div className="font-bold text-xs text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-amber-700" />
                <span>Add New Rod Specification</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Size / Grade <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 6mm, 32mm, Binding Wire"
                    value={newRodSize}
                    onChange={(e) => setNewRodSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Default Rate per Kg (₹)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    placeholder="e.g. 68.50"
                    value={newRodRate}
                    onChange={(e) => setNewRodRate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Description / Steel Brand
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Fe 550D TMT"
                    value={newRodNotes}
                    onChange={(e) => setNewRodNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Rod Size</span>
                </button>
              </div>
            </form>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
              {rodSizes.map((s) => {
                const isEditing = editingRodId === s.id;

                if (isEditing) {
                  return (
                    <div key={s.id} className="p-3 bg-amber-50/50 space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={editRodSize}
                          onChange={(e) => setEditRodSize(e.target.value)}
                          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white font-bold"
                        />
                        <input
                          type="number"
                          step="0.1"
                          value={editRodRate}
                          onChange={(e) => setEditRodRate(e.target.value)}
                          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white font-semibold"
                        />
                        <input
                          type="text"
                          value={editRodNotes}
                          onChange={(e) => setEditRodNotes(e.target.value)}
                          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingRodId(null)}
                          className="px-3 py-1 rounded text-slate-600 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveRodEdit(s.id)}
                          className="px-3 py-1 rounded bg-amber-600 text-white font-bold text-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={s.id} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-xs">
                    <div>
                      <span className="font-bold text-slate-900 block text-sm">{s.size}</span>
                      {s.notes && <span className="text-[11px] text-slate-500">{s.notes}</span>}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block uppercase font-semibold">Rate / Kg</span>
                        <span className="font-bold text-amber-800 text-sm">
                          {s.defaultRate ? `₹${s.defaultRate.toFixed(2)}` : "Manual"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRodId(s.id);
                            setEditRodSize(s.size);
                            setEditRodRate(s.defaultRate ? String(s.defaultRate) : "");
                            setEditRodNotes(s.notes || "");
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteRod(s.id, s.size)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 3: PAYMENT MODES                                                */}
        {/* =================================================================== */}
        {activeTab === "payment" && (
          <div className="space-y-5">
            <form onSubmit={handleAddPayMode} className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
              <div className="font-bold text-xs text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-blue-700" />
                <span>Add Payment Channel / Bank Account</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Channel Code (Short Identifier) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC, ICICI, QR"
                    value={newPayCode}
                    onChange={(e) => setNewPayCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-mono uppercase font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Display Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. HDFC Bank Current A/c"
                    value={newPayLabel}
                    onChange={(e) => setNewPayLabel(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Channel</span>
                </button>
              </div>
            </form>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
              {paymentModes.map((m) => (
                <div key={m.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block font-mono text-sm">{m.code}</span>
                    <span className="text-slate-500 text-[11px]">{m.label}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {m.isSystem ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                        System Standard
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleDeletePayMode(m.id, m.code)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                        title="Delete Channel"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =================================================================== */}
        {/* TAB 4: EXPENSE CATEGORIES                                           */}
        {/* =================================================================== */}
        {activeTab === "expense" && (
          <div className="space-y-5">
            <form onSubmit={handleAddExpense} className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 flex items-end gap-2 text-xs">
              <div className="flex-1">
                <label className="block font-semibold text-slate-700 mb-1">
                  New Cash Outflow Category Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Loading / Unloading Labour, Generator Fuel"
                  value={newExpName}
                  onChange={(e) => setNewExpName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1 shrink-0 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Category</span>
              </button>
            </form>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
              {expenseCats.map((c) => (
                <div key={c.id} className="p-3.5 flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold text-slate-900 text-sm">{c.name}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(c.id, c.name)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                    title="Delete Category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

