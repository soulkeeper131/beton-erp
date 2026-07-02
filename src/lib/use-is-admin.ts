"use client";
import { useSession } from "next-auth/react";

export function useIsAdmin() {
  const { data: session } = useSession();
  return (session?.user as any)?.role === "admin";
}
