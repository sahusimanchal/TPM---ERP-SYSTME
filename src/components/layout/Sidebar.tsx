"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Users, 
  Receipt, 
  PlusCircle, 
  CreditCard, 
  Undo2, 
  Banknote, 
  BarChart3, 
  FileSpreadsheet, 
  Settings,
  Building2,
  AlertTriangle
} from "lucide-react";
import { getReturns, getBills } from "@/lib/storage";
import { useState, useEffect } from "react";

export default function Sidebar() {
  const pathname = usePathname();
  const [unverifiedCount, setUnverifiedCount] = useState(0);

  useEffect(() => {
    const updateCounts = () => {
      const returns = getReturns();
      setUnverifiedCount(returns.filter(r => r.status === "pending_review").length);
    };
    updateCounts();
    window.addEventListener("tpm_data_updated", updateCounts);
    return () => window.removeEventListener("tpm_data_updated", updateCounts);
  }, []);

  const navLinks = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/customers", label: "Customers & Ledger", icon: Users },
    { href: "/sales", label: "Sales & Billing", icon: Receipt },
    { href: "/sales/new", label: "Create Bill", icon: PlusCircle, highlight: true },
    { href: "/payments", label: "Payments Received", icon: CreditCard },
    { 
      href: "/returns", 
      label: "Sales Returns", 
      icon: Undo2, 
      badge: unverifiedCount > 0 ? `${unverifiedCount}` : undefined 
    },
    { href: "/cash-flow", label: "Cash Outflows", icon: Banknote },
    { href: "/reports", label: "Financial Reports", icon: BarChart3 },
    { href: "/import", label: "Excel Migration", icon: FileSpreadsheet, badge: "Admin" },
    { href: "/settings", label: "Settings & Audit", icon: Settings },
  ];

  return (
    <aside className="w-64 bg-[#14243A] text-white flex flex-col shrink-0 min-h-screen border-r border-[#0F1A2A] shadow-xl no-print">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-700/60 bg-[#0F1A2A]/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center font-black text-white shadow-md text-lg tracking-wider">
            TPM
          </div>
          <div className="leading-tight">
            <h1 className="font-bold text-sm tracking-tight text-white uppercase">
              THE PRAMOD MAHARAJ
            </h1>
            <p className="text-[11px] font-medium text-blue-300">
              Enterprises ERP System
            </p>
          </div>
        </div>
      </div>

      {/* Navigation Menu */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        <div className="px-3 py-2 text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          Main Modules
        </div>

        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm font-semibold"
                  : link.highlight
                  ? "text-blue-300 hover:bg-slate-800 hover:text-white"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-4 h-4 ${isActive ? "text-white" : link.highlight ? "text-blue-400" : "text-slate-400"}`} />
                <span>{link.label}</span>
              </div>
              {link.badge && (
                <span className={`px-2 py-0.5 text-xs rounded-full font-bold ${
                  link.badge === "Admin" 
                    ? "bg-slate-700 text-slate-200"
                    : "bg-amber-500 text-slate-900"
                }`}>
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-700/60 bg-[#0F1A2A]/50 text-xs text-slate-400 space-y-1">
        <div className="flex items-center justify-between text-slate-300 font-medium">
          <span>Active Book</span>
          <span className="text-blue-400 font-semibold">OCT 2026</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span>Financial Year</span>
          <span>2026 - 2027</span>
        </div>
      </div>
    </aside>
  );
}
