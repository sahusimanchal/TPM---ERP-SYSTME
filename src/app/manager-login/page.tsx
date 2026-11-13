import LoginView from "@/components/auth/LoginView";
import { Suspense } from "react";

export const metadata = {
  title: "Manager Login — THE PRAMOD MAHARAJ ENTERPRISES ERP",
  description: "Operations, sales, customers and collections login portal",
};

export default function ManagerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F1A2A]" />}>
      <LoginView initialRole="manager" />
    </Suspense>
  );
}

