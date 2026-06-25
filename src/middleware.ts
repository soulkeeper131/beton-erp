import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware — no NextAuth, no DB, no edge runtime issues
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public routes — allow without auth
  const publicPaths = ["/login", "/api/auth", "/api/health"];
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
