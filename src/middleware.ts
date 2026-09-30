import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { isBrigadirApiBlocked, isBrigadirPageAllowed } from "@/lib/roles";

// In-memory rate limiter. Лимитът е по потребител (не по IP): преди 100 заявки/мин
// на IP важаха за целия офис зад един рутер и за /api/auth/session — при бързо
// отваряне на страници идваха 429 и празни екрани. Входът има отделен строг лимит.
const rateMap = new Map<string, { count: number; reset: number }>();
const WINDOW_MS = 60_000;
const API_LIMIT = 600; // заявки/мин на потребител или API ключ
const LOGIN_LIMIT = 10; // опита за вход/мин на IP

function checkRateLimit(key: string, limit: number): boolean {
  const now = Date.now();
  if (rateMap.size > 5000) {
    for (const [k, v] of rateMap) if (now > v.reset) rateMap.delete(k);
  }
  const entry = rateMap.get(key);
  if (!entry || now > entry.reset) {
    rateMap.set(key, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}

function tooMany() {
  return NextResponse.json({ error: "Твърде много заявки — опитайте след минута" }, { status: 429 });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Адресът на клиента: X-Real-IP (проксито го презаписва) или последният адрес в
  // X-Forwarded-For — него го добавя нашето прокси; предните може да са подправени.
  const ip = request.headers.get("x-real-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",").pop()?.trim()
    || request.ip || "unknown";
  const isApi = pathname.startsWith("/api/");

  // Опити за вход с парола
  if (request.method === "POST" && pathname.startsWith("/api/auth/callback")) {
    if (!checkRateLimit("login:" + ip, LOGIN_LIMIT)) {
      // signIn() от next-auth/react чете грешката от url
      return NextResponse.json({ error: "RateLimit", url: new URL("/login?error=RateLimit", request.url).toString() }, { status: 429 });
    }
  }

  // Public routes — allow without auth
  const publicPaths = ["/login", "/api/auth", "/api/health", "/manifest.json", "/sw.js"];
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    const response = NextResponse.next();
    if (!pathname.startsWith("/api/")) {
      response.headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      response.headers.set("Pragma", "no-cache");
      response.headers.set("Expires", "0");
    }
    return response;
  }

  // Static files and public assets — no auth required
  if (/\.(html|css|js|png|jpg|jpeg|gif|svg|ico|webp|woff2?|ttf|eot|pdf|json|xml|txt|map)$/i.test(pathname)) {
    return NextResponse.next();
  }

  // API key auth (Bearer token) — for AI/automation
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const envKey = !!process.env.API_KEY && token === process.env.API_KEY;
    // Ключовете от базата се проверяват в самия route (edge няма достъп до SQLite)
    if (envKey || (token && pathname === "/api/tools/call")) {
      if (isApi && !checkRateLimit("key:" + (envKey ? "env" : ip), API_LIMIT)) return tooMany();
      return NextResponse.next();
    }
  }

  // Сесията се валидира (подпис + срок), не само наличието на cookie —
  // иначе произволно "authjs.session-token=x" минаваше през middleware-а
  const secureCookie = !!request.cookies.get("__Secure-authjs.session-token");
  const token = await getToken({ req: request, secret: process.env.AUTH_SECRET, secureCookie }).catch(() => null);

  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isApi && !checkRateLimit("user:" + (token.sub || token.email || ip), API_LIMIT)) return tooMany();

  // Ограничения по роля — бригадирът няма достъп до финансови модули
  if (token.role === "brigadir") {
    if (pathname.startsWith("/api/")) {
      if (isBrigadirApiBlocked(pathname)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (!isBrigadirPageAllowed(pathname)) {
      return NextResponse.redirect(new URL("/", request.url));
    }
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
