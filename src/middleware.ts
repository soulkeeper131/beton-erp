import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware — cookie-based auth + API key support
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — allow without auth
  const publicPaths = ["/login", "/api/auth", "/api/health"];
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const response = NextResponse.next();
    if (!pathname.startsWith("/api/")) {
      response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    }
    return response;
  }

  // API key auth (Bearer token) — for AI/automation
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    if (token === process.env.API_KEY) {
      return NextResponse.next();
    }
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
