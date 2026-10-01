"use client";
import { useSession } from "next-auth/react";

export function useIsAdmin() {
  const { data: session } = useSession();
  return (session?.user as any)?.role === "admin";
}

/** Ролята на текущия потребител (undefined докато сесията се зарежда). */
export function useRole(): string | undefined {
  const { data: session } = useSession();
  return (session?.user as any)?.role;
}
