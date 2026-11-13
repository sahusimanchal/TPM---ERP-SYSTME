"use client";

import { useState, useEffect } from "react";
import { Building2, Shield, History, Check, Save, AlertTriangle, RotateCcw, Database, LogOut, Lock, CheckCircle2 } from "lucide-react";
import seedData from "@/data/seedData.json";
import { 
  getStoredUserRole, 
  resetAllDataToSeed, 
  getAuditLogs,
  getBusinessProfile,
  saveBusinessProfile
} from "@/lib/storage";
import { UserRole, AuditLog, AuthUser, BusinessProfile } from "@/lib/types";
import { getClientSession, signOutUser } from "@/lib/auth";
import MasterCatalogSettingsSection from "@/components/admin/MasterCatalogSettingsSection";

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState("");
  const [gstin, setGstin] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  const [role, setRole] = useState<UserRole>("owner");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const profile = getBusinessProfile();
    setBusinessName(profile.name);
    setGstin(profile.gstin);
    setPhone(profile.phone);
    setEmail(profile.email);
    setAddress(profile.address);

    setRole(getStoredUserRole());
    setAuditLogs(getAuditLogs());
    const session = getClientSession();
    if (session?.user) {
      setCurrentUser(session.user);
      if (session.user.role) setRole(session.user.role);
    }

    const onDataUpdate = () => {
      setAuditLogs(getAuditLogs());
      const p = getBusinessProfile();
      setBusinessName(p.name);
      setGstin(p.gstin);
      setPhone(p.phone);
      setEmail(p.email);
      setAddress(p.address);
    };
    window.addEventListener("tpm_data_updated", onDataUpdate);
    return () => window.removeEventListener("tpm_data_updated", onDataUpdate);
  }, []);

  const handleSignOut = async () => {
    if (confirm("Are you sure you want to sign out?")) {
      await signOutUser();
      window.location.href = "/login";
    }
  };

  const handleConfirmReset = () => {
    if (role !== "owner") return;
    if (confirmText.trim().toUpperCase() !== "RESET") return;
    resetAllDataToSeed();
    window.location.href = "/";
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const actor = currentUser?.fullName 
      ? `${currentUser.fullName} (${role.toUpperCase()})` 
      : role === "owner" ? "Pramod Maharaj (Owner)" : "System Administrator (Admin)";

    saveBusinessProfile({
      name: businessName,
      gstin: gstin,
      phone: phone,
      email: email,
      address: address,
    }, actor);

    setSaved(true);
    setSaveSuccessMsg("Business profile updated and saved successfully!");
    setTimeout(() => {
      setSaved(false);
      setSaveSuccessMsg(null);
    }, 4000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Business Settings & Audit Trail
        </h1>
        <p className="text-sm text-slate-500">
          Organization profile, tax settings, user roles, and immutable transaction audit logs
        </p>
      </div>

      {/* Business Profile Form */}
      <form onSubmit={handleSave} className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-6 space-y-4">
        <div className="flex items-center gap-2 pb-3 border-b border-slate-200">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-slate-900 text-sm">Business Entity Profile</h3>
        </div>

        {saveSuccessMsg && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">{saveSuccessMsg}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Company / Legal Trade Name</label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 uppercase font-semibold"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">GSTIN Number</label>
            <input
              type="text"
              value={gstin}
              onChange={(e) => setGstin(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 font-mono"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Contact Phone</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block font-semibold text-slate-700 mb-1">Shop & Godown Address</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-200"
            />
          </div>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Timezone: <strong className="text-slate-800">Asia/Kolkata (IST)</strong> • Currency: <strong className="text-slate-800">INR (₹)</strong>
          </span>

          <button
            type="submit"
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
          >
            {saved ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Saved Changes</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Profile</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Admin Master Product & Catalogs Management Hub */}
      <MasterCatalogSettingsSection role={role} />

      {/* Immutable Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-slate-700" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">System Audit Trail</h3>
              <p className="text-xs text-slate-500">Traceable log of migrations, adjustments, and financial entries</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Audit Enabled
          </span>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {auditLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-slate-50/70 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 font-bold text-slate-900">
                  <span className="px-2 py-0.5 rounded text-[10px] bg-slate-100 text-slate-800 uppercase font-mono">
                    {log.action}
                  </span>
                  <span>{log.entity}</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono">{log.timestamp}</span>
              </div>
              <div className="text-slate-600 text-[11px]">
                {log.notes}
              </div>
              <div className="text-[10px] text-blue-600 font-semibold">
                Actor: {log.actor}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verified Role & Active Session Security */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm shrink-0 border border-blue-200">
              {role === "owner" ? "PM" : role === "manager" ? "MN" : role === "admin" ? "AD" : "OP"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  {currentUser?.fullName || (role === "owner" ? "Pramod Maharaj" : `${role.toUpperCase()} User`)}
                </h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  role === "owner"
                    ? "bg-amber-100 text-amber-800 border border-amber-200"
                    : role === "manager"
                    ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                    : "bg-purple-100 text-purple-800 border border-purple-200"
                }`}>
                  {role} Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {currentUser?.email || `${role}@pramodmaharaj.in`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors shadow-2xs self-start sm:self-auto"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out Session</span>
          </button>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
          <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          <span>
            <strong>Role-Based Access Governance:</strong> Account roles are securely managed via Supabase RLS policies and database profiles. Active sessions cannot self-elevate permissions. Contact an Administrator to adjust permissions.
          </span>
        </div>
      </div>

      {/* Data Management -> Danger Zone */}
      <div className="bg-white rounded-2xl border border-rose-200 shadow-2xs overflow-hidden">
        <div className="p-5 bg-rose-50/60 border-b border-rose-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-rose-600">
                Data Management
              </div>
              <h3 className="font-bold text-rose-950 text-sm">
                Danger Zone — Wipe / Reset All Data
              </h3>
            </div>
          </div>
          <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-100 text-rose-800 border border-rose-200">
            Owner Only
          </span>
        </div>

        <div className="p-5 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="font-bold text-slate-900">
                Reset Local ERP Ledger & Transactions
              </div>
              <p className="text-slate-500 leading-relaxed max-w-xl">
                Permanently deletes all locally created bills, payment receipts, sales returns, cash outflows, and customer accounts, restoring the clean baseline state. This action cannot be undone.
              </p>
            </div>

            {role === "owner" ? (
              !showResetConfirm && (
                <button
                  type="button"
                  onClick={() => {
                    setShowResetConfirm(true);
                    setConfirmText("");
                  }}
                  className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-2xs transition-colors shrink-0"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Wipe / Reset Data</span>
                </button>
              )
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-100 text-slate-500 font-semibold border border-slate-200 shrink-0">
                Restricted to Owner role
              </div>
            )}
          </div>

          {showResetConfirm && role === "owner" && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
              <div className="flex items-start gap-2.5 text-rose-900">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold text-xs">
                    Explicit Confirmation Required
                  </div>
                  <p className="text-[11px] text-rose-700">
                    Type <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-rose-200">RESET</strong> below to confirm wiping all ERP data and customer ledgers.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type RESET to confirm..."
                  className="flex-1 px-3 py-2 rounded-lg border border-rose-300 bg-white text-slate-900 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowResetConfirm(false);
                      setConfirmText("");
                    }}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={confirmText.trim().toUpperCase() !== "RESET"}
                    onClick={handleConfirmReset}
                    className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 disabled:cursor-not-allowed text-white font-bold transition-colors"
                  >
                    Confirm Permanent Wipe
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
