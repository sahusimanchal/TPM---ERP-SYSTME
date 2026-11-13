"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { UserRole, AuthUser } from "@/lib/types";
import { getStoredUserRole } from "@/lib/storage";
import { getClientSession, signOutUser } from "@/lib/auth";
import { Menu, Settings, LogOut } from "lucide-react";

export default function Header() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole>("owner");
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const syncUser = () => {
      setRole(getStoredUserRole());
      const session = getClientSession();
      if (session?.user) {
        setCurrentUser(session.user);
        if (session.user.role) setRole(session.user.role);
      }
    };
    syncUser();
    window.addEventListener("tpm_data_updated", syncUser);
    return () => window.removeEventListener("tpm_data_updated", syncUser);
  }, []);

  const handleOpenMobileMenu = () => {
    window.dispatchEvent(new Event("tpm_toggle_mobile_menu"));
  };

  const handleLogout = async () => {
    if (confirm("Are you sure you want to sign out of TPM ERP?")) {
      await signOutUser();
      window.location.href = "/login";
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-2xs no-print">
      {/* Desktop Header (1024px and above) */}
      <div className="hidden lg:flex h-16 px-6 items-center justify-between">
        {/* Left: Organization Title */}
        <div className="flex items-center gap-4 min-w-0">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-[#14243A] tracking-tight truncate">
              THE PRAMOD MAHARAJ ENTERPRISES
            </h2>
            <p className="text-xs text-slate-500 font-medium truncate">
              Building Materials, Cement, Steel & Electricals ERP
            </p>
          </div>
        </div>

        {/* Right: User Profile Badge, Settings & Logout */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/settings"
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
            title="Account & System Settings"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs border border-blue-200 shrink-0">
              {role === "owner" ? "PM" : role === "manager" ? "MN" : role === "admin" ? "AD" : "OP"}
            </div>
            <div className="leading-tight text-left">
              <div className="text-xs font-bold text-slate-800">
                {currentUser?.fullName || (role === "owner" ? "Pramod Maharaj" : `${role.toUpperCase()} User`)}
              </div>
              <div className="text-[10px] text-slate-500 font-medium capitalize flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{role} Account</span>
              </div>
            </div>
            <Settings className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            title="Sign out of TPM ERP"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-600 hover:text-rose-700 text-xs font-semibold transition-colors shadow-2xs ml-1"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>

      {/* Tablet Header (768px to 1023px) */}
      <div className="hidden md:flex lg:hidden h-14 px-4 items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
            TPM
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#14243A] tracking-tight truncate">
              THE PRAMOD MAHARAJ ENTERPRISES
            </div>
            <div className="text-[11px] text-slate-500 truncate">
              Building Materials, Cement, Steel & Electricals ERP
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/settings"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700"
          >
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px] font-bold">
              {role === "owner" ? "PM" : role === "manager" ? "MN" : role === "admin" ? "AD" : "OP"}
            </span>
            <span className="capitalize">{role}</span>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            aria-label="Logout"
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center shadow-2xs"
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleOpenMobileMenu}
            aria-label="Open navigation menu"
            className="w-9 h-9 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[#14243A] flex items-center justify-center shadow-2xs"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Mobile Header (Below 768px) */}
      <div className="md:hidden px-3.5 py-2.5 space-y-2">
        {/* First Row: TPM Logo + Short Business Name + Logout + Hamburger Menu */}
        <div className="flex items-center justify-between gap-2">
          <Link href="/" className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#14243A] text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0 border border-blue-500/30">
              TPM
            </div>
            <span className="font-extrabold text-sm text-[#14243A] tracking-tight truncate">
              PRAMOD MAHARAJ
            </span>
          </Link>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleLogout}
              aria-label="Logout"
              className="w-8 h-8 rounded-lg border border-slate-200 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 flex items-center justify-center"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleOpenMobileMenu}
              aria-label="Open navigation menu"
              className="w-9 h-9 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[#14243A] flex items-center justify-center shrink-0 active:scale-95 transition-transform"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Second Row: Dashboard Title & Subtitle (When on Dashboard) */}
        {pathname === "/" && (
          <div className="pt-1.5 border-t border-slate-100">
            <h1 className="text-base font-bold text-[#14243A] tracking-tight leading-snug">
              Financial & Operations Dashboard
            </h1>
            <p className="text-[11px] text-slate-500 font-medium leading-tight">
              Business financial overview
            </p>
          </div>
        )}
      </div>
    </header>
  );
}
