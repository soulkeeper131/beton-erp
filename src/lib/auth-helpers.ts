import { auth } from "@/auth";

const apiKey = process.env.API_KEY || "";

// Валиден ли е Bearer API ключът (за Hermes/автоматизация)
export function isApiKeyValid(req: Request): boolean {
  const h = req.headers.get("authorization");
  return !!h && h.startsWith("Bearer ") && h.slice(7) === apiKey;
}

// Единна auth точка: връща session (browser) ИЛИ isApiKey (Hermes/автоматизация)
export async function getAuth(req: Request) {
  const session = await auth();
  if (session) return { session, isApiKey: false };
  if (isApiKeyValid(req)) return { session: null, isApiKey: true };
  return { session: null, isApiKey: false };
}

// Admin gate: сесия с роля admin ИЛИ валиден API ключ (API ключът = пълен достъп)
export async function requireAdmin(req?: Request) {
  if (req && isApiKeyValid(req)) {
    return { isApiKey: true, user: { id: 0, role: "admin" } };
  }
  const session = await auth();
  if (!session || !session.user) return null;
  if ((session.user as any).role !== "admin") return "forbidden" as const;
  return session;
}
