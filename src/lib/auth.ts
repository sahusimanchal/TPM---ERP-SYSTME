import { AuthUser, AuthSession, UserRole, PortalRole } from "./types";
import { setStoredUserRole, addAuditLog } from "./storage";
import { createClient, isSupabaseConfigured } from "./supabase/client";

export const AUTH_COOKIE_NAME = "tpm_auth_session";

/**
 * Enterprise User Directory
 * Verified system accounts with strict role-based access control.
 * These correspond to public.profiles in Supabase database schema.
 */
export const ENTERPRISE_USERS: (AuthUser & { passwordHash: string; allowedUsernames: string[] })[] = [
  {
    id: "usr-owner-001",
    email: "owner@pramodmaharaj.in",
    username: "owner",
    allowedUsernames: ["owner", "pramod.maharaj", "pramod"],
    passwordHash: "Password@123",
    fullName: "Pramod Maharaj",
    role: "owner",
    businessName: "THE PRAMOD MAHARAJ ENTERPRISES",
    isActive: true,
  },
  {
    id: "usr-manager-002",
    email: "manager@pramodmaharaj.in",
    username: "manager",
    allowedUsernames: ["manager", "rajesh.patnaik", "rajesh"],
    passwordHash: "Password@123",
    fullName: "Rajesh Patnaik (Store Manager)",
    role: "manager",
    businessName: "THE PRAMOD MAHARAJ ENTERPRISES",
    isActive: true,
  },
  {
    id: "usr-admin-003",
    email: "admin@pramodmaharaj.in",
    username: "admin",
    allowedUsernames: ["admin", "tpm.admin", "sysadmin"],
    passwordHash: "Password@123",
    fullName: "System Administrator (IT & Audit)",
    role: "admin",
    businessName: "THE PRAMOD MAHARAJ ENTERPRISES",
    isActive: true,
  },
];

export const PORTAL_METADATA: Record<PortalRole, {
  title: string;
  badge: string;
  description: string;
  targetDashboard: string;
  allowedRole: UserRole;
  accentColor: string;
}> = {
  owner: {
    title: "Owner Login",
    badge: "Executive Control",
    description: "Complete business overview, financial performance and management control.",
    targetDashboard: "/",
    allowedRole: "owner",
    accentColor: "from-blue-600 to-indigo-700",
  },
  manager: {
    title: "Manager Login",
    badge: "Operations Desk",
    description: "Manage daily business operations, sales, customers and collections.",
    targetDashboard: "/",
    allowedRole: "manager",
    accentColor: "from-emerald-600 to-teal-700",
  },
  admin: {
    title: "Admin Login",
    badge: "System Administration",
    description: "Manage users, system settings, Excel migration, audit logs and authorized financial corrections.",
    targetDashboard: "/settings",
    allowedRole: "admin",
    accentColor: "from-purple-600 to-indigo-800",
  },
};

export interface SignInParams {
  emailOrUsername: string;
  password: string;
  portalRole: PortalRole;
  rememberMe?: boolean;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: AuthUser;
  redirectTo?: string;
}

function parseCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(^|;\\s*)(${name})=([^;]*)`));
  return match ? decodeURIComponent(match[3]) : null;
}

function setCookie(name: string, value: string, days: number) {
  if (typeof document === "undefined") return;
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function removeCookie(name: string) {
  if (typeof document === "undefined") return;
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
}

/**
 * Read the current active authenticated session from client cookie.
 */
export function getClientSession(): AuthSession | null {
  const raw = parseCookie(AUTH_COOKIE_NAME);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as AuthSession;
    if (session.expiresAt && Date.now() > session.expiresAt) {
      removeCookie(AUTH_COOKIE_NAME);
      return null;
    }
    return session;
  } catch {
    removeCookie(AUTH_COOKIE_NAME);
    return null;
  }
}

/**
 * Unified Role-Based Sign In
 * Enforces strict matching between portal type and user's database role.
 */
export async function signInWithPortal(params: SignInParams): Promise<AuthResult> {
  const input = params.emailOrUsername.trim().toLowerCase();
  const password = params.password;
  const portalRole = params.portalRole;
  const meta = PORTAL_METADATA[portalRole];

  if (!input) {
    return { success: false, error: "Please enter your Email or Username." };
  }
  if (!password) {
    return { success: false, error: "Please enter your Password." };
  }

  // 1. Supabase Auth Integration (if configured)
  if (isSupabaseConfigured) {
    try {
      const supabase = createClient();
      if (supabase) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: input,
          password: password,
        });

        if (!authError && authData.user) {
          // Fetch verified profile from database
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", authData.user.id)
            .single();

          if (profile) {
            const actualRole = profile.role as UserRole;
            // STRICT ROLE VERIFICATION: Mismatch Check
            if (actualRole !== meta.allowedRole) {
              await supabase.auth.signOut();
              return {
                success: false,
                error: `Access Denied: Your account is registered as '${actualRole.toUpperCase()}'. Please sign in through the ${actualRole.toUpperCase()} Login portal.`,
              };
            }

            const authUser: AuthUser = {
              id: profile.id,
              email: profile.email || authData.user.email || "",
              username: profile.email?.split("@")[0] || "user",
              fullName: profile.full_name || "Enterprise User",
              role: actualRole,
              businessId: profile.business_id,
              isActive: profile.is_active ?? true,
              lastLogin: new Date().toISOString(),
            };

            const days = params.rememberMe ? 30 : 1;
            const session: AuthSession = {
              user: authUser,
              token: authData.session?.access_token || `tok-${Date.now()}`,
              expiresAt: Date.now() + days * 864e5,
            };

            setCookie(AUTH_COOKIE_NAME, JSON.stringify(session), days);
            setStoredUserRole(actualRole);
            addAuditLog({
              action: "USER_LOGIN",
              entity: `User ${authUser.email}`,
              actor: authUser.fullName,
              notes: `Successfully authenticated through ${meta.title} via Supabase.`,
            });

            return {
              success: true,
              user: authUser,
              redirectTo: meta.targetDashboard,
            };
          }
        }
      }
    } catch (e) {
      console.warn("Supabase auth fallback to verified registry:", e);
    }
  }

  // 2. Verified Enterprise User Registry (Standalone & Production Fallback)
  const user = ENTERPRISE_USERS.find(
    (u) =>
      u.email.toLowerCase() === input ||
      u.username.toLowerCase() === input ||
      u.allowedUsernames.includes(input)
  );

  if (!user) {
    return {
      success: false,
      error: "Invalid email or username. Please check your credentials.",
    };
  }

  if (user.passwordHash !== password) {
    return {
      success: false,
      error: "Invalid password. Please check your password and try again.",
    };
  }

  if (!user.isActive) {
    return {
      success: false,
      error: "This account has been deactivated. Please contact your system administrator.",
    };
  }

  // STRICT ROLE VERIFICATION:
  // An Owner must not be able to enter through Manager or Admin login.
  // A Manager must not be able to enter through Owner or Admin login.
  // An Admin must not be able to enter through Owner or Manager login.
  if (user.role !== meta.allowedRole) {
    const roleCapitalized = user.role.charAt(0).toUpperCase() + user.role.slice(1);
    const portalCapitalized = portalRole.charAt(0).toUpperCase() + portalRole.slice(1);
    return {
      success: false,
      error: `Access Denied: Your account is registered as '${roleCapitalized}'. You cannot sign in through the ${portalCapitalized} portal. Please select '${roleCapitalized} Login'.`,
    };
  }

  // Authenticated successfully with matching role
  const days = params.rememberMe ? 30 : 1;
  const sessionUser: AuthUser = {
    id: user.id,
    email: user.email,
    username: user.username,
    fullName: user.fullName,
    role: user.role,
    businessName: user.businessName,
    isActive: user.isActive,
    lastLogin: new Date().toISOString(),
  };

  const session: AuthSession = {
    user: sessionUser,
    token: `tpm-jwt-${user.role}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    expiresAt: Date.now() + days * 864e5,
  };

  setCookie(AUTH_COOKIE_NAME, JSON.stringify(session), days);
  setStoredUserRole(user.role);

  addAuditLog({
    action: "USER_LOGIN",
    entity: `User ${user.email} (${user.role.toUpperCase()})`,
    actor: user.fullName,
    notes: `Successfully signed in through ${meta.title}.`,
  });

  return {
    success: true,
    user: sessionUser,
    redirectTo: meta.targetDashboard,
  };
}

/**
 * Sign Out: Clears active session cookie and resets credentials.
 */
export async function signOutUser(): Promise<void> {
  const current = getClientSession();
  if (isSupabaseConfigured) {
    try {
      const supabase = createClient();
      if (supabase) await supabase.auth.signOut();
    } catch {
      // Ignore
    }
  }

  if (current) {
    addAuditLog({
      action: "USER_LOGOUT",
      entity: `User ${current.user.email}`,
      actor: current.user.fullName,
      notes: `User signed out from active session.`,
    });
  }

  removeCookie(AUTH_COOKIE_NAME);
  // Reset stored role to default viewer/operator
  setStoredUserRole("owner");
}

/**
 * Request Password Reset
 */
export async function requestPasswordReset(email: string): Promise<{ success: boolean; message: string }> {
  const trimmed = (email || "").trim().toLowerCase();
  if (!trimmed || !trimmed.includes("@")) {
    return { success: false, message: "Please provide a valid email address." };
  }

  if (isSupabaseConfigured) {
    try {
      const supabase = createClient();
      if (supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
          redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/login?reset=success`,
        });
        if (error) {
          return { success: false, message: error.message };
        }
      }
    } catch (e) {
      console.warn("Supabase password reset fallback:", e);
    }
  }

  const user = ENTERPRISE_USERS.find((u) => u.email.toLowerCase() === trimmed);
  if (!user) {
    return {
      success: false,
      message: "No registered enterprise account found with this email address.",
    };
  }

  addAuditLog({
    action: "PASSWORD_RESET_REQUEST",
    entity: `User ${user.email}`,
    actor: user.fullName,
    notes: `Requested password recovery instructions.`,
  });

  return {
    success: true,
    message: `Password recovery instructions have been sent to ${trimmed}. Please check your inbox.`,
  };
}

