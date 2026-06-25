import { Shell } from "@/components/layout/shell";
import { SessionProvider } from "@/components/providers/session-provider";

export const dynamic = "force-dynamic";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <Shell>{children}</Shell>
    </SessionProvider>
  );
}
