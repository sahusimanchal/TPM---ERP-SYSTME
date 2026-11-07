"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { Building2, Shield, History, Check, Save } from "lucide-react";
import seedData from "@/data/seedData.json";

export default function SettingsPage() {
  const [businessName, setBusinessName] = useState(seedData.business.name);
  const [gstin, setGstin] = useState(seedData.business.gstin);
  const [phone, setPhone] = useState(seedData.business.phone);
  const [email, setEmail] = useState(seedData.business.email);
  const [address, setAddress] = useState(seedData.business.address);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Mock initial audit events
  const auditLogs = [
    {
      id: "log-1",
      action: "IMPORT",
      entity: "FINANCIAL 26 - 27 - OCT.xlsm",
      actor: "Pramod Maharaj (Owner)",
      timestamp: "2026-11-06 22:51:35",
      notes: "Imported 551 bills, 284 payments, 22 returns, 49 cash transactions. Sheet1 and Sheet3 excluded."
    },
    {
      id: "log-2",
      action: "INIT_SCHEMA",
      entity: "PostgreSQL Database",
      actor: "System Administrator",
      timestamp: "2026-11-06 23:04:45",
      notes: "Created 19 normalized tables with RLS policies and decimal precision constraints."
    },
    {
      id: "log-3",
      action: "VERIFICATION_GATE",
      entity: "Sales Returns & Cash Outflows",
      actor: "System Policy",
      timestamp: "2026-11-06 23:05:00",
      notes: "Flagged 12 returns with missing amounts and 23 outflows with missing dates for review."
    }
  ];

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
    </div>
  );
}
