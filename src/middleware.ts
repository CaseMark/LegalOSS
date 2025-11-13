/**
 * Middleware for route protection
 * Lightweight token check (Edge runtime compatible)
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Check for NextAuth session token (either secure or non-secure)
  const sessionToken =
    request.cookies.get("authjs.session-token")?.value || request.cookies.get("__Secure-authjs.session-token")?.value;

  const isLoggedIn = !!sessionToken;
  const isOnDashboard = pathname.startsWith("/dashboard");
  const isOnAuth = pathname.startsWith("/auth");

  // Protect dashboard routes
  if (isOnDashboard && !isLoggedIn) {
    // Redirect to register (will check if first user on that page)
    const registerUrl = new URL("/auth/v1/register", request.url);
    registerUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(registerUrl);
  }

  // Redirect logged-in users away from auth pages
  if (isOnAuth && isLoggedIn) {
    return NextResponse.redirect(new URL("/dashboard/default", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|pdf.worker.mjs).*)"],
};
