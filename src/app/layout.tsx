import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/layout/AppShell";

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
      <body className="min-h-screen bg-[#F5F7FA] text-[#14243A] antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
