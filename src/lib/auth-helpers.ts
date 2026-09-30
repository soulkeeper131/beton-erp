import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/db";
import { users } from "@/db/schema";

const apiKey = process.env.API_KEY || "";

// Валиден ли е Bearer API ключът (за Hermes/автоматизация).
// Без зададен API_KEY няма API достъп — иначе празен "Bearer " минаваше.
export function isApiKeyValid(req: Request): boolean {
  if (!apiKey) return false;
  const h = req.headers.get("authorization");
  return !!h && h.startsWith("Bearer ") && h.slice(7) === apiKey;
}

// Сесията (JWT) живее до изтичане, затова активността и ролята се четат от базата
// при всяка заявка: деактивиран потребител губи достъп веднага, смяна на роля важи веднага.
async function currentSession() {
  const session = await auth();
  const id = parseInt(String((session?.user as any)?.id ?? ""));
  if (!session?.user || isNaN(id)) return null;
  const user = db.select({ active: users.active, role: users.role }).from(users).where(eq(users.id, id)).get();
  if (!user || !user.active) return null;
  (session.user as any).role = user.role;
  return session;
}

// Единна auth точка: връща session (browser) ИЛИ isApiKey (Hermes/автоматизация)
export async function getAuth(req: Request) {
  const session = await currentSession();
  if (session) return { session, isApiKey: false };
  if (isApiKeyValid(req)) return { session: null, isApiKey: true };
  return { session: null, isApiKey: false };
}

// Admin gate: сесия с роля admin ИЛИ валиден API ключ (API ключът = пълен достъп)
export async function requireAdmin(req?: Request) {
  if (req && isApiKeyValid(req)) {
    return { isApiKey: true, user: { id: 0, role: "admin" } };
  }
  const session = await currentSession();
  if (!session || !session.user) return null;
  if ((session.user as any).role !== "admin") return "forbidden" as const;
  return session;
}

// Guard за API route: 401 без валидна сесия или API ключ. Употреба:
//   const denied = await requireAuth(req); if (denied) return denied;
export async function requireAuth(req: Request): Promise<NextResponse | null> {
  const { session, isApiKey } = await getAuth(req);
  if (!session?.user && !isApiKey) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return null;
}

// Като requireAdmin, но връща готов отговор при отказ или id на администратора
// (null при API ключ). Употреба: const a = await adminGate(req); if ("denied" in a) return a.denied;
export async function adminGate(req: Request, forbiddenMsg = "Само за администратор"):
  Promise<{ denied: NextResponse } | { userId: number | null }> {
  const admin = await requireAdmin(req);
  if (!admin) return { denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (admin === "forbidden") return { denied: NextResponse.json({ error: forbiddenMsg }, { status: 403 }) };
  return { userId: parseInt(String((admin as any).user?.id ?? "")) || null };
}
