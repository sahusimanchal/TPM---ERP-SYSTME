"use client";

import { useState, useEffect } from "react";
import { 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  AlertCircle, 
  Building2, 
  Package, 
  TrendingUp, 
  CreditCard, 
  Layers,
  ShieldCheck,
  CheckCircle2
} from "lucide-react";
import { 
  CementBrand, 
  RodSize, 
  PaymentModeOption, 
  ExpenseCategoryOption 
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
  deleteExpenseCategory,
  getStoredUserRole
} from "@/lib/storage";
import { getClientSession } from "@/lib/auth";

/* ========================================================================= */
/* 1. CEMENT BRAND MANAGER MODAL (Admin Access)                              */
/* ========================================================================= */

interface CementBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBrandCreated?: (brand: CementBrand) => void;
}

export function CementBrandManagerModal({ isOpen, onClose, onBrandCreated }: CementBrandModalProps) {
  const [brands, setBrands] = useState<CementBrand[]>([]);
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const refreshBrands = () => {
    setBrands(getCementBrands());
  };

  useEffect(() => {
    if (isOpen) {
      refreshBrands();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getActor = () => {
    const session = getClientSession();
    return session?.user?.fullName 
      ? `${session.user.fullName} (${session.user.role.toUpperCase()})`
      : "System Administrator (Admin Account)";
  };

  const handleAddBrand = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = addCementBrand(
      {
        name: newName,
        defaultRate: parseFloat(newRate) || 0,
        notes: newNotes,
      },
      getActor()
    );

    if (!res.success) {
      setErrorMsg(res.error || "Failed to add brand.");
      return;
    }

    setSuccessMsg(`Cement brand "${res.brand?.name}" successfully added!`);
    setNewName("");
    setNewRate("");
    setNewNotes("");
    refreshBrands();

    if (res.brand && onBrandCreated) {
      onBrandCreated(res.brand);
    }
  };

  const startEdit = (b: CementBrand) => {
    setEditingId(b.id);
    setEditName(b.name);
    setEditRate(b.defaultRate ? String(b.defaultRate) : "");
    setEditNotes(b.notes || "");
  };

  const saveEdit = (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = updateCementBrand(
      id,
      {
        name: editName,
        defaultRate: parseFloat(editRate) || 0,
        notes: editNotes,
      },
      getActor()
    );

    if (!res.success) {
      setErrorMsg(res.error || "Failed to update brand.");
      return;
    }

    setSuccessMsg(`Brand "${res.brand?.name}" updated successfully.`);
    setEditingId(null);
    refreshBrands();
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to permanently remove cement brand "${name}" from the active catalog?`)) {
      const res = deleteCementBrand(id, getActor());
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete brand.");
      } else {
        setSuccessMsg(`Cement brand "${name}" removed from catalog.`);
        refreshBrands();
      }
    }
  };

  const toggleActive = (b: CementBrand) => {
    updateCementBrand(b.id, { isActive: !b.isActive }, getActor());
    refreshBrands();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-fadeIn">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Manage Cement Brands & Bag Rates
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                  Admin Control
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Configure brand names, default prices per bag, or remove obsolete brands.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add New Brand Box */}
          <form onSubmit={handleAddBrand} className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-200/80 space-y-3">
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
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white uppercase font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes / Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. PPC / Weather Guard"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Brand to Catalog</span>
              </button>
            </div>
          </form>

          {/* Current Brands Catalog Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
              <span>Configured Cement Brands ({brands.length})</span>
              <span className="text-slate-400 font-normal text-[11px]">
                Active brands appear in Create Bill & Returns
              </span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
              {brands.map((b) => {
                const isEditing = editingId === b.id;

                if (isEditing) {
                  return (
                    <div key={b.id} className="p-3 bg-blue-50/50 space-y-2 text-xs">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white uppercase font-bold"
                          placeholder="Brand Name"
                        />
                        <input
                          type="number"
                          step="0.5"
                          value={editRate}
                          onChange={(e) => setEditRate(e.target.value)}
                          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white font-semibold"
                          placeholder="Default Rate ₹"
                        />
                        <input
                          type="text"
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                          placeholder="Notes"
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 rounded text-slate-600 hover:bg-slate-200 text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => saveEdit(b.id)}
                          className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </button>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={b.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => toggleActive(b)}
                        className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${
                          b.isActive
                            ? "bg-emerald-600 border-emerald-600 text-white"
                            : "border-slate-300 bg-white"
                        }`}
                        title={b.isActive ? "Click to deactivate" : "Click to activate"}
                      >
                        {b.isActive && <Check className="w-3 h-3 stroke-[3]" />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold uppercase tracking-tight ${b.isActive ? "text-slate-900" : "text-slate-400 line-through"}`}>
                            {b.name}
                          </span>
                          {!b.isActive && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-100 text-slate-500 font-semibold">
                              Inactive
                            </span>
                          )}
                        </div>
                        {b.notes && (
                          <p className="text-[11px] text-slate-500">{b.notes}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">Default Rate</span>
                        <span className="font-bold text-emerald-800">
                          {b.defaultRate ? `₹${b.defaultRate.toFixed(2)}` : "Manual"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(b)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Edit Brand"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(b.id, b.name)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete / Remove Brand"
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
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between text-xs">
          <span className="text-slate-500 text-[11px]">
            Changes are logged to the immutable system audit trail.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-colors"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

/* ========================================================================= */
/* 2. ROD / STEEL SIZES MANAGER MODAL (Admin Access)                         */
/* ========================================================================= */

interface RodSizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSizeCreated?: (size: RodSize) => void;
}

export function RodSizeManagerModal({ isOpen, onClose, onSizeCreated }: RodSizeModalProps) {
  const [sizes, setSizes] = useState<RodSize[]>([]);
  const [newSize, setNewSize] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editSize, setEditSize] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editNotes, setEditNotes] = useState("");

  const refreshSizes = () => {
    setSizes(getRodSizes());
  };

  useEffect(() => {
    if (isOpen) {
      refreshSizes();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getActor = () => {
    const session = getClientSession();
    return session?.user?.fullName 
      ? `${session.user.fullName} (${session.user.role.toUpperCase()})`
      : "System Administrator (Admin Account)";
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = addRodSize(
      {
        size: newSize,
        defaultRate: parseFloat(newRate) || 0,
        notes: newNotes,
      },
      getActor()
    );

    if (!res.success) {
      setErrorMsg(res.error || "Failed to add rod size.");
      return;
    }

    setSuccessMsg(`Rod size "${res.size?.size}" added!`);
    setNewSize("");
    setNewRate("");
    setNewNotes("");
    refreshSizes();

    if (res.size && onSizeCreated) {
      onSizeCreated(res.size);
    }
  };

  const startEdit = (s: RodSize) => {
    setEditingId(s.id);
    setEditSize(s.size);
    setEditRate(s.defaultRate ? String(s.defaultRate) : "");
    setEditNotes(s.notes || "");
  };

  const saveEdit = (id: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = updateRodSize(
      id,
      {
        size: editSize,
        defaultRate: parseFloat(editRate) || 0,
        notes: editNotes,
      },
      getActor()
    );

    if (!res.success) {
      setErrorMsg(res.error || "Failed to update rod size.");
      return;
    }

    setSuccessMsg(`Rod size "${res.size?.size}" updated.`);
    setEditingId(null);
    refreshSizes();
  };

  const handleDelete = (id: string, sizeName: string) => {
    if (confirm(`Remove rod specification "${sizeName}" from active catalog?`)) {
      const res = deleteRodSize(id, getActor());
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete.");
      } else {
        setSuccessMsg(`Removed "${sizeName}" from catalog.`);
        refreshSizes();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-fadeIn">
        
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">
                  Manage TMT Steel Rod Sizes & Kg Rates
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200 uppercase">
                  Admin Control
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Configure steel rebar sizes (e.g. 8mm, 10mm, 12mm, 32mm) and default rates per kg.
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Add Box */}
          <form onSubmit={handleAdd} className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
            <div className="font-bold text-xs text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-amber-700" />
              <span>Add Rod Size Specification</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Size Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 6mm, 32mm, Binding Wire"
                  value={newSize}
                  onChange={(e) => setNewSize(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-bold text-slate-900"
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
                  value={newRate}
                  onChange={(e) => setNewRate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white font-semibold text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Grade / Brand Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Fe 550D / Tata Tiscon"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white text-slate-900"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Specification</span>
              </button>
            </div>
          </form>

          {/* List Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white shadow-2xs">
            {sizes.map((s) => {
              const isEditing = editingId === s.id;

              if (isEditing) {
                return (
                  <div key={s.id} className="p-3 bg-amber-50/50 space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={editSize}
                        onChange={(e) => setEditSize(e.target.value)}
                        className="px-2.5 py-1.5 rounded border border-slate-300 bg-white font-bold"
                      />
                      <input
                        type="number"
                        step="0.1"
                        value={editRate}
                        onChange={(e) => setEditRate(e.target.value)}
                        className="px-2.5 py-1.5 rounded border border-slate-300 bg-white font-semibold"
                      />
                      <input
                        type="text"
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        className="px-2.5 py-1.5 rounded border border-slate-300 bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 rounded text-slate-600 text-xs font-semibold"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => saveEdit(s.id)}
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
                <div key={s.id} className="p-3 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-xs">
                  <div>
                    <span className="font-bold text-slate-900 block">{s.size}</span>
                    {s.notes && <span className="text-[11px] text-slate-500">{s.notes}</span>}
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] block">Rate / Kg</span>
                      <span className="font-bold text-amber-800">
                        {s.defaultRate ? `₹${s.defaultRate.toFixed(2)}/kg` : "Manual"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(s)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-blue-600"
                        title="Edit Size"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(s.id, s.size)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                        title="Delete Size"
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

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

/* ========================================================================= */
/* 3. PAYMENT MODES MANAGER MODAL (Admin Access)                             */
/* ========================================================================= */

interface PaymentModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModeCreated?: (mode: PaymentModeOption) => void;
}

export function PaymentModeManagerModal({ isOpen, onClose, onModeCreated }: PaymentModeModalProps) {
  const [modes, setModes] = useState<PaymentModeOption[]>([]);
  const [newCode, setNewCode] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const refreshModes = () => {
    setModes(getPaymentModes());
  };

  useEffect(() => {
    if (isOpen) {
      refreshModes();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getActor = () => {
    const session = getClientSession();
    return session?.user?.fullName 
      ? `${session.user.fullName} (${session.user.role.toUpperCase()})`
      : "System Administrator (Admin Account)";
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = addPaymentMode({ code: newCode, label: newLabel }, getActor());
    if (!res.success) {
      setErrorMsg(res.error || "Failed to add payment mode.");
      return;
    }

    setSuccessMsg(`Payment mode "${res.mode?.code}" added.`);
    setNewCode("");
    setNewLabel("");
    refreshModes();

    if (res.mode && onModeCreated) {
      onModeCreated(res.mode);
    }
  };

  const handleDelete = (id: string, code: string) => {
    if (confirm(`Remove custom payment mode "${code}"?`)) {
      const res = deletePaymentMode(id, getActor());
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete.");
      } else {
        setSuccessMsg(`Payment mode "${code}" removed.`);
        refreshModes();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-fadeIn">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Manage Payment Modes & Bank Channels
              </h3>
              <p className="text-xs text-slate-500">
                Configure collection accounts (e.g. HDFC, ICICI, QR Code).
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdd} className="p-4 rounded-xl bg-blue-50/50 border border-blue-200 space-y-3">
            <div className="font-bold text-xs text-blue-950 uppercase tracking-wider flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-blue-700" />
              <span>Add Payment Channel</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Code / Short Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC, ICICI"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 uppercase font-bold"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Display Label *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. HDFC Current Account"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Channel</span>
              </button>
            </div>
          </form>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
            {modes.map((m) => (
              <div key={m.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900 block font-mono">{m.code}</span>
                  <span className="text-[11px] text-slate-500">{m.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {m.isSystem ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">
                      Standard
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDelete(m.id, m.code)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                      title="Delete Custom Channel"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

/* ========================================================================= */
/* 4. EXPENSE CATEGORIES MANAGER MODAL (Admin Access)                        */
/* ========================================================================= */

interface ExpenseCatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoryCreated?: (cat: ExpenseCategoryOption) => void;
}

export function ExpenseCategoryManagerModal({ isOpen, onClose, onCategoryCreated }: ExpenseCatModalProps) {
  const [cats, setCats] = useState<ExpenseCategoryOption[]>([]);
  const [newName, setNewName] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const refreshCats = () => {
    setCats(getExpenseCategories());
  };

  useEffect(() => {
    if (isOpen) {
      refreshCats();
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getActor = () => {
    const session = getClientSession();
    return session?.user?.fullName 
      ? `${session.user.fullName} (${session.user.role.toUpperCase()})`
      : "System Administrator (Admin Account)";
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const res = addExpenseCategory(newName, getActor());
    if (!res.success) {
      setErrorMsg(res.error || "Failed to add category.");
      return;
    }

    setSuccessMsg(`Expense category "${res.category?.name}" added.`);
    setNewName("");
    refreshCats();

    if (res.category && onCategoryCreated) {
      onCategoryCreated(res.category);
    }
  };

  const handleDelete = (id: string, catName: string) => {
    if (confirm(`Remove expense category "${catName}"?`)) {
      const res = deleteExpenseCategory(id, getActor());
      if (!res.success) {
        setErrorMsg(res.error || "Failed to delete.");
      } else {
        setSuccessMsg(`Category "${catName}" removed.`);
        refreshCats();
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden text-slate-900 animate-fadeIn">
        
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Manage Cash Outflow & Expense Categories
              </h3>
              <p className="text-xs text-slate-500">
                Configure expense categories (e.g. Staff Advance, Shop Rent, Freight).
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <form onSubmit={handleAdd} className="p-4 rounded-xl bg-rose-50/50 border border-rose-200 flex items-end gap-2 text-xs">
            <div className="flex-1">
              <label className="block font-semibold text-slate-700 mb-1">
                Category Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Loading / Unloading Labour"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-rose-600 text-white font-bold text-xs flex items-center gap-1 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </form>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100 bg-white">
            {cats.map((c) => (
              <div key={c.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                <span className="font-semibold text-slate-900">{c.name}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(c.id, c.name)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600"
                  title="Delete Category"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs">
            Done
          </button>
        </div>

      </div>
    </div>
  );
}

