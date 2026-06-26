import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware — no NextAuth, no DB, no edge runtime issues
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — allow without auth
  const publicPaths = ["/login", "/api/auth", "/api/health"];
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const response = NextResponse.next();
    // No cache for HTML pages (skip API routes)
    if (!pathname.startsWith("/api/")) {
      response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    }
    return response;
  }

  // Check for auth session cookie
  const authCookie =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!authCookie) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();
  // No cache for HTML pages (skip API routes)
  if (!pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
