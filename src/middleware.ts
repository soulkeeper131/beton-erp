import { auth } from "@/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const { pathname } = req.nextUrl;

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

  // Auth check
  if (!req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Admin-only for write operations on API routes
  const writeMethods = ["POST", "PATCH", "DELETE", "PUT"];
  if (
    pathname.startsWith("/api/") &&
    writeMethods.includes(req.method) &&
    (req.auth.user as any)?.role !== "admin"
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const response = NextResponse.next();
  if (!pathname.startsWith("/api/")) {
    response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
