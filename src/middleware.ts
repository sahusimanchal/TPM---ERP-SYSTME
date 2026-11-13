import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE = "tpm_auth_session";

// Public auth routes accessible without login
const AUTH_ROUTES = ["/login", "/owner-login", "/manager-login", "/admin-login"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Read auth session cookie
  const sessionCookie = request.cookies.get(AUTH_COOKIE)?.value;
  let isAuthenticated = false;
  let userRole = "owner";

  if (sessionCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(sessionCookie));
      if (parsed?.expiresAt && parsed.expiresAt > Date.now() && parsed?.user?.role) {
        isAuthenticated = true;
        userRole = parsed.user.role;
      }
    } catch {
      // Invalid session cookie
      isAuthenticated = false;
    }
  }

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));

  // Case 1: Authenticated user visiting login pages -> redirect to appropriate dashboard
  if (isAuthenticated && isAuthRoute) {
    const target = userRole === "admin" ? "/settings" : "/";
    return NextResponse.redirect(new URL(target, request.url));
  }

  // Case 2: Unauthenticated user visiting protected dashboard pages -> redirect to login
  if (!isAuthenticated && !isAuthRoute) {
    const loginUrl = new URL("/login", request.url);
    // Optionally preserve return path
    if (pathname !== "/") {
      loginUrl.searchParams.set("from", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - Static asset extensions (.png, .jpg, .svg, .css, .js, etc.)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|css|js)$).*)",
  ],
};

