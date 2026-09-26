"use client";

import { useSession } from "next-auth/react";
import ChatWidget from "@/components/chat/chat-widget";
import { canUseAgent } from "@/lib/agent/permissions";

// Асистентът се показва само на роли, които имат достъп до него (не и на бригадира)
export default function ChatGate() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  if (!canUseAgent(role)) return null;
  return <ChatWidget />;
}
