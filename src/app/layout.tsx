import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export const metadata: Metadata = {
  title: "THE PRAMOD MAHARAJ ENTERPRISES — ERP & Accounting System",
  description: "Production business accounting ERP web application for The Pramod Maharaj Enterprises",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F5F7FA] text-[#14243A] flex flex-row antialiased">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 min-h-screen">
          <Header />
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-x-hidden">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
