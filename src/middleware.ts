import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isAuth = !!req.auth;
  const role = (req.auth?.user as any)?.role;

  // Public routes
  if (pathname === "/login" || pathname.startsWith("/api/auth") || pathname === "/api/health") {
    return NextResponse.next();
  }

  // Not authenticated
  if (!isAuth) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Admin-only routes
  const adminRoutes = ["/users", "/templates", "/audit-log", "/api-keys"];
  if (adminRoutes.some((r) => pathname.startsWith(r)) && role !== "admin") {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
