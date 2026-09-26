// Права по роли — споделено между middleware (edge) и UI, затова без импорти от db/auth.

// Страници, които бригадирът вижда (и техните подстраници).
export const BRIGADIR_ALLOWED_PAGES = ["/", "/sites", "/map", "/calendar", "/pourings"];

// API-та с финансови/административни данни, забранени за бригадира.
export const BRIGADIR_BLOCKED_API = [
  "/api/reports",
  "/api/invoices",
  "/api/recurring",
  "/api/export",
  "/api/audit-log",
  "/api/company-settings",
  "/api/users",
  "/api/imap-test",
  "/api/smtp-test",
  "/api/upload-logo",
  "/api/agent",
];

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(prefix + "/");
}

export function isBrigadirPageAllowed(pathname: string): boolean {
  return BRIGADIR_ALLOWED_PAGES.some((p) => (p === "/" ? pathname === "/" : matches(pathname, p)));
}

export function isBrigadirApiBlocked(pathname: string): boolean {
  return BRIGADIR_BLOCKED_API.some((p) => matches(pathname, p));
}
