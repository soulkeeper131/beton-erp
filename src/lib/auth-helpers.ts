import { auth } from "@/auth";

export async function requireAdmin() {
  const session = await auth();
  if (!session || !session.user) return null;
  if ((session.user as any).role !== "admin") return "forbidden" as const;
  return session;
}
