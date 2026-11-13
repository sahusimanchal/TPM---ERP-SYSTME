"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Crown, 
  BriefcaseBusiness, 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Loader2, 
  KeyRound,
  Sparkles
} from "lucide-react";
import { PortalRole } from "@/lib/types";
import { 
  signInWithPortal, 
  requestPasswordReset, 
  PORTAL_METADATA, 
  getClientSession,
  ENTERPRISE_USERS
} from "@/lib/auth";

interface LoginViewProps {
  initialRole?: PortalRole | null;
}

export default function LoginView({ initialRole = null }: LoginViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activePortal, setActivePortal] = useState<PortalRole>(initialRole || "owner");
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [suggestedPortal, setSuggestedPortal] = useState<PortalRole | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);

  // If already authenticated with a valid session, redirect immediately
  useEffect(() => {
    const session = getClientSession();
    if (session && session.user?.role) {
      const redirect = session.user.role === "admin" ? "/settings" : "/";
      router.replace(redirect);
    }
  }, [router]);

  // Sync initialRole if route changes
  useEffect(() => {
    if (initialRole) {
      setActivePortal(initialRole);
      setErrorMsg(null);
      setSuggestedPortal(null);
    }
  }, [initialRole]);

  const handleTabChange = (role: PortalRole) => {
    setActivePortal(role);
    setErrorMsg(null);
    setSuggestedPortal(null);
    setSuccessMsg(null);
  };

  const handleQuickFill = (role: PortalRole) => {
    const preset = ENTERPRISE_USERS.find(u => u.role === role);
    if (preset) {
      setEmailOrUsername(preset.email);
      setPassword("Password@123");
      setErrorMsg(null);
      setSuggestedPortal(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuggestedPortal(null);
    setSuccessMsg(null);
    setIsLoading(true);

    try {
      const res = await signInWithPortal({
        emailOrUsername,
        password,
        portalRole: activePortal,
        rememberMe,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Authentication failed. Please verify your credentials.");
        
        const inputLower = emailOrUsername.trim().toLowerCase();
        const matchedUser = ENTERPRISE_USERS.find(
          u => u.email.toLowerCase() === inputLower || u.username.toLowerCase() === inputLower || u.allowedUsernames.includes(inputLower)
        );
        if (matchedUser && (matchedUser.role === "owner" || matchedUser.role === "manager" || matchedUser.role === "admin")) {
          setSuggestedPortal(matchedUser.role as PortalRole);
        }

        setIsLoading(false);
        return;
      }

      setSuccessMsg(`Welcome, ${res.user?.fullName}!`);

      const returnUrl = searchParams.get("from");
      const target = returnUrl || res.redirectTo || "/";

      setTimeout(() => {
        window.location.href = target;
      }, 300);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected network error occurred.");
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);
    setResetLoading(true);

    try {
      const res = await requestPasswordReset(resetEmail);
      if (!res.success) {
        setResetError(res.message);
      } else {
        setResetSuccess(res.message);
        setTimeout(() => {
          setShowForgotPassword(false);
          setResetSuccess(null);
          setResetEmail("");
        }, 2500);
      }
    } catch (err: any) {
      setResetError(err.message || "Unable to send password recovery instructions.");
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#080E1A] text-slate-100 flex items-center justify-center p-4 sm:p-8 lg:p-12 relative overflow-hidden font-sans select-none">
      
      {/* Dynamic Ambient Background Lights */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-blue-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-indigo-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[42rem] h-[42rem] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Subtle Dot Grid */}
      <div className="absolute inset-0 bg-[radial-gradient(rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:24px_24px] opacity-40 pointer-events-none" />

      {/* ========================================================================= */}
      {/* MAIN CONTAINER (Clean Glass Backdrop)                                     */}
      {/* ========================================================================= */}
      <div className="w-full max-w-5xl rounded-[2.5rem] bg-white/[0.03] backdrop-blur-2xl border border-white/10 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.8)] p-6 sm:p-10 lg:p-12 flex flex-col lg:flex-row items-center justify-between gap-10 lg:gap-14 relative z-10">
        
        {/* ===================================================================== */}
        {/* LEFT: MINIMALIST, HIGH-END SIGN-IN CARD (Ultra-clean, zero clutter)   */}
        {/* ===================================================================== */}
        <div className="w-full lg:w-[420px] shrink-0 bg-white text-slate-900 rounded-3xl p-7 sm:p-9 shadow-2xl border border-slate-100 relative z-20">
          
          {/* Brand Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#14243A] to-blue-700 text-white font-black flex items-center justify-center text-sm shadow-md shadow-blue-900/20">
              TPM
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight text-slate-950 uppercase leading-none">
                THE PRAMOD MAHARAJ
              </div>
              <div className="text-[11px] text-blue-600 font-semibold tracking-wide mt-0.5">
                ENTERPRISES ERP
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-slate-950 tracking-tight">
              Sign In
            </h1>
          </div>

          {/* Clean 3-Way Role Switcher (Zero extra description boxes) */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/80 mb-6">
            <button
              type="button"
              onClick={() => handleTabChange("owner")}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activePortal === "owner"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Crown className="w-3.5 h-3.5" />
              <span>Owner</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("manager")}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activePortal === "manager"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <BriefcaseBusiness className="w-3.5 h-3.5" />
              <span>Manager</span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("admin")}
              className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 ${
                activePortal === "admin"
                  ? "bg-purple-600 text-white shadow-md shadow-purple-600/30"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs mb-4 space-y-2 animate-fadeIn">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-snug font-medium">{errorMsg}</div>
              </div>
              {suggestedPortal && suggestedPortal !== activePortal && (
                <button
                  type="button"
                  onClick={() => handleTabChange(suggestedPortal)}
                  className="w-full py-1.5 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[11px] transition-colors flex items-center justify-center gap-1.5"
                >
                  <span>Switch to {PORTAL_METADATA[suggestedPortal].title}</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs mb-4 flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="font-semibold">{successMsg}</div>
            </div>
          )}

          {/* Sign In Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email / Username Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email or Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  placeholder="username@pramodmaharaj.in"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 text-sm transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-medium text-slate-900 text-sm transition-all placeholder:text-slate-400"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password Row */}
            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="font-medium text-slate-600 text-xs">Remember Me</span>
              </label>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  setResetEmail(emailOrUsername.includes("@") ? emailOrUsername : "");
                  setResetError(null);
                  setResetSuccess(null);
                }}
                className="font-semibold text-blue-600 hover:text-blue-700 text-xs transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Clean Gradient Action Button */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-lg transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.99] disabled:opacity-60 bg-gradient-to-r mt-3 ${
                activePortal === "owner"
                  ? "from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25"
                  : activePortal === "manager"
                  ? "from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-500/25"
                  : "from-purple-600 to-indigo-700 hover:from-purple-700 hover:to-indigo-800 shadow-purple-500/25"
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Discreet Quick Autofill */}
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={() => handleQuickFill(activePortal)}
              className="text-[11px] text-slate-400 hover:text-blue-600 font-medium transition-colors"
            >
              Auto-fill demo credentials ({activePortal})
            </button>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* RIGHT: DYNAMIC 3D ARTISTIC FOCAL POINT (Like Image 2, ZERO TEXT BLOAT) */}
        {/* ===================================================================== */}
        <div className="flex-1 w-full flex items-center justify-center relative py-6 lg:py-10">
          
          <div className="relative w-full max-w-[440px] aspect-square flex items-center justify-center">
            
            {/* Dynamic Ambient Orbit Glow */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-blue-600/30 via-indigo-500/20 to-cyan-400/30 blur-2xl animate-pulse" />

            {/* Animated Orbiting Ring 1 */}
            <div 
              className="absolute inset-4 rounded-full border border-dashed border-blue-400/20"
              style={{ animation: "spin 35s linear infinite" }}
            />
            
            {/* Animated Orbiting Ring 2 */}
            <div 
              className="absolute inset-14 rounded-full border border-indigo-400/20"
              style={{ animation: "spin 25s linear infinite reverse" }}
            />

            {/* Floating 3D Geometric Isometric Sculpture & Particles */}
            <svg 
              viewBox="0 0 500 500" 
              className="w-full h-full relative z-10 drop-shadow-[0_25px_35px_rgba(0,0,0,0.6)]"
            >
              <defs>
                {/* 3D Gradients */}
                <linearGradient id="cubeTop" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#60A5FA" />
                  <stop offset="100%" stopColor="#2563EB" />
                </linearGradient>
                <linearGradient id="cubeLeft" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1D4ED8" />
                  <stop offset="100%" stopColor="#0F172A" />
                </linearGradient>
                <linearGradient id="cubeRight" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3B82F6" />
                  <stop offset="100%" stopColor="#1E3A8A" />
                </linearGradient>

                <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FDE68A" />
                  <stop offset="50%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#B45309" />
                </linearGradient>

                <linearGradient id="glassSphere" x1="20%" y1="20%" x2="80%" y2="80%">
                  <stop offset="0%" stopColor="#93C5FD" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#3B82F6" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#1E3A8A" stopOpacity="0.2" />
                </linearGradient>

                <linearGradient id="emeraldSphere" x1="20%" y1="20%" x2="80%" y2="80%">
                  <stop offset="0%" stopColor="#6EE7B7" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#10B981" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#064E3B" stopOpacity="0.2" />
                </linearGradient>

                <filter id="glowLight" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="8" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Base Isometric Shadow */}
              <ellipse cx="250" cy="385" rx="140" ry="40" fill="#030712" opacity="0.6" filter="url(#glowLight)" />

              {/* Floating Base Platform */}
              <g className="transition-transform duration-700">
                <polygon points="250,330 380,260 250,190 120,260" fill="url(#cubeTop)" opacity="0.85" />
                <polygon points="120,260 250,330 250,370 120,300" fill="url(#cubeLeft)" />
                <polygon points="250,330 380,260 380,300 250,370" fill="url(#cubeRight)" />
              </g>

              {/* Floating Central Core Crystal / Shield */}
              <g style={{ animation: "float 4s ease-in-out infinite" }}>
                {/* 3D Monolith Facets */}
                <polygon points="250,105 320,150 250,195 180,150" fill="url(#cubeTop)" />
                <polygon points="180,150 250,195 250,265 180,220" fill="url(#cubeLeft)" />
                <polygon points="250,195 320,150 320,220 250,265" fill="url(#cubeRight)" />

                {/* Inner Glowing TPM Emblem Facet */}
                <circle cx="250" cy="180" r="32" fill="url(#goldGrad)" filter="url(#glowLight)" opacity="0.9" />
                <text 
                  x="250" 
                  y="186" 
                  textAnchor="middle" 
                  fill="#1E293B" 
                  fontSize="16" 
                  fontWeight="900" 
                  fontFamily="system-ui"
                  letterSpacing="1"
                >
                  TPM
                </text>
              </g>

              {/* Dynamic Floating Particles & 3D Spheres (Inspired by Image 2's floating leaves/elements) */}
              {/* Particle 1: Cyan Sphere */}
              <g style={{ animation: "float 3s ease-in-out infinite 0.5s" }}>
                <circle cx="115" cy="180" r="22" fill="url(#glassSphere)" />
                <circle cx="110" cy="173" r="6" fill="#FFFFFF" opacity="0.7" />
              </g>

              {/* Particle 2: Emerald Orb */}
              <g style={{ animation: "float 4.5s ease-in-out infinite 1s" }}>
                <circle cx="385" cy="190" r="18" fill="url(#emeraldSphere)" />
                <circle cx="380" cy="184" r="5" fill="#FFFFFF" opacity="0.6" />
              </g>

              {/* Particle 3: Gold Prism */}
              <g style={{ animation: "float 3.5s ease-in-out infinite 1.5s" }}>
                <polygon points="370,110 390,95 380,125" fill="url(#goldGrad)" opacity="0.9" />
              </g>

              {/* Particle 4: Floating Sapphire Shard */}
              <g style={{ animation: "float 5s ease-in-out infinite 0.8s" }}>
                <polygon points="140,290 155,275 148,305" fill="#60A5FA" opacity="0.8" />
              </g>

              {/* Floating Metallic Rod Accent (3D cylinder representing Steel) */}
              <g style={{ animation: "float 4s ease-in-out infinite 0.3s" }}>
                <rect x="330" y="270" width="12" height="65" rx="6" transform="rotate(-25 330 270)" fill="url(#goldGrad)" opacity="0.85" />
              </g>

              {/* Floating Cement Block Accent (Isometric mini cube) */}
              <g style={{ animation: "float 3.8s ease-in-out infinite 1.2s" }}>
                <polygon points="110,120 130,108 110,96 90,108" fill="#93C5FD" opacity="0.9" />
                <polygon points="90,108 110,120 110,135 90,123" fill="#3B82F6" />
                <polygon points="110,120 130,108 130,123 110,135" fill="#1D4ED8" />
              </g>

              {/* Soft Ambient Light Sparks */}
              <circle cx="200" cy="95" r="2.5" fill="#FFFFFF" opacity="0.8" />
              <circle cx="310" cy="85" r="3" fill="#FDE68A" opacity="0.9" />
              <circle cx="160" cy="220" r="2" fill="#93C5FD" opacity="0.7" />
              <circle cx="340" cy="230" r="2.5" fill="#6EE7B7" opacity="0.8" />
            </svg>
          </div>
        </div>

      </div>

      {/* ===================================================================== */}
      {/* FORGOT PASSWORD MODAL                                                 */}
      {/* ===================================================================== */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 text-slate-900 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">Forgot Password</h3>
                <p className="text-xs text-slate-500">
                  Enter your registered email to receive password reset instructions.
                </p>
              </div>
            </div>

            {resetError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{resetError}</span>
              </div>
            )}

            {resetSuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <form onSubmit={handleResetPassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Registered Account Email
                </label>
                <input
                  type="email"
                  required
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="owner@pramodmaharaj.in"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50"
                >
                  {resetLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Send Reset Link</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Global Inline Keyframe Animations */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-10px) rotate(1.5deg);
          }
        }
      `}</style>
    </div>
  );
}
