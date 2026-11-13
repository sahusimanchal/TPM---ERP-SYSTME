"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Routes where sidebar and dashboard header should NOT be displayed
  const isAuthRoute =
    pathname === "/login" ||
    pathname === "/owner-login" ||
    pathname === "/manager-login" ||
    pathname === "/admin-login" ||
    pathname.startsWith("/login/");

  if (isAuthRoute) {
    return (
      <div className="min-h-screen w-full bg-[#0F1A2A] antialiased">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#14243A] flex flex-row antialiased w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Header />
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}

