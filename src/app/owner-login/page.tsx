import LoginView from "@/components/auth/LoginView";
import { Suspense } from "react";

export const metadata = {
  title: "Owner Login — THE PRAMOD MAHARAJ ENTERPRISES ERP",
  description: "Executive control and financial management login portal",
};

export default function OwnerLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0F1A2A]" />}>
      <LoginView initialRole="owner" />
    </Suspense>
  );
}

