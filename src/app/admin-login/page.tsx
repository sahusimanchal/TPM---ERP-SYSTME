import LoginView from "@/components/auth/LoginView";
import { Suspense } from "react";

export const metadata = {
  title: "Admin Login — THE PRAMOD MAHARAJ ENTERPRISES ERP",
  description: "User management, system settings and audit control login portal",
};

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F1A2A]" />}>
      <LoginView initialRole="admin" />
    </Suspense>
  );
}

