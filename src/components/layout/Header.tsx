"use client";

import { useState, useEffect } from "react";
import { UserRole } from "@/lib/types";
import { getStoredUserRole, setStoredUserRole, resetAllDataToSeed } from "@/lib/storage";
import { ShieldCheck, UserCheck, RefreshCw, Bell, Search, AlertCircle } from "lucide-react";

export default function Header() {
  const [role, setRole] = useState<UserRole>("owner");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    setRole(getStoredUserRole());
  }, []);

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    setStoredUserRole(newRole);
  };

  const handleResetData = () => {
    if (confirm("Reset application data back to historical October 2026 Excel records? Any newly entered test data will be refreshed.")) {
      setIsResetting(true);
      resetAllDataToSeed();
      setTimeout(() => {
        setIsResetting(false);
        window.location.reload();
      }, 500);
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20 shadow-sm no-print">
      {/* Left: Organization Title */}
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-[#14243A] tracking-tight">
            THE PRAMOD MAHARAJ ENTERPRISES
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Building Materials, Cement, Steel & Electricals ERP
          </p>
        </div>
      </div>

      {/* Right: Actions, Role Selector & User */}
      <div className="flex items-center gap-4">
        {/* Reset to Seed Button */}
        <button
          onClick={handleResetData}
          disabled={isResetting}
          title="Reset database state to original October 2026 Excel records"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isResetting ? "animate-spin" : ""}`} />
          <span>Reset Demo Data</span>
        </button>

        {/* Live Role Switcher */}
        <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
          <span className="text-[11px] font-semibold text-slate-500 px-2 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Role:
          </span>
          {(["owner", "manager", "operator"] as UserRole[]).map((r) => (
            <button
              key={r}
              onClick={() => handleRoleChange(r)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md capitalize transition-all ${
                role === r
                  ? "bg-white text-blue-600 shadow-2xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        {/* User Profile Badge */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs border border-blue-200">
            {role === "owner" ? "PM" : role === "manager" ? "MN" : "OP"}
          </div>
          <div className="hidden md:block leading-tight text-left">
            <div className="text-xs font-semibold text-slate-800 capitalize">
              {role === "owner" ? "Pramod Maharaj" : `${role} User`}
            </div>
            <div className="text-[10px] text-slate-500 capitalize">{role} Account</div>
          </div>
        </div>
      </div>
    </header>
  );
}
