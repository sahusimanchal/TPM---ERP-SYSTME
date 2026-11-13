import LoginView from "@/components/auth/LoginView";
import { Suspense } from "react";

export const metadata = {
  title: "Login — THE PRAMOD MAHARAJ ENTERPRISES ERP",
  description: "Select account type to sign in to TPM Business ERP",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F1A2A]" />}>
      <LoginView />
    </Suspense>
  );
}

