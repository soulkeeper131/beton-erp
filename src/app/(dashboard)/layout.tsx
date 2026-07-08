import { Shell } from "@/components/layout/shell";
import { SessionProvider } from "@/components/providers/session-provider";
import ChatWidget from "@/components/chat/chat-widget";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
      <ChatWidget />
    </SessionProvider>
  );
}
