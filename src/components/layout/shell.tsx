"use client";

import { useState, useEffect } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Табло", icon: "🏠" },
  { href: "/clients", label: "Клиенти", icon: "👥" },
  { href: "/sites", label: "Обекти", icon: "🏗️" },
  { href: "/map", label: "Карта", icon: "🗺️" },
  { href: "/offers", label: "Оферти", icon: "📋" },
  { href: "/calendar", label: "Календар", icon: "📅" },
  { href: "/pourings", label: "Актуване", icon: "🪣" },
  { href: "/machines", label: "Машини", icon: "🚛" },
  { href: "/workers", label: "Работници", icon: "👷" },
  { href: "/attendance", label: "Явки", icon: "🕒" },
  { href: "/materials", label: "Склад", icon: "📦" },
  { href: "/invoices", label: "Фактури", icon: "🧾" },
  { href: "/recurring", label: "Периодични", icon: "🔁" },
  { href: "/reports", label: "Справки", icon: "📊" },
  { href: "/services", label: "Услуги", icon: "🔧" },
  { href: "/concrete-types", label: "Типове бетон", icon: "🧱" },
  { href: "/audit-log", label: "Одит лог", icon: "📋" },
  { href: "/users", label: "Потребители", icon: "👤", adminOnly: true },
];

// Бригадир вижда само обекти, карта, календар и актове (снимки)
const brigadirAllowed = ["/", "/sites", "/map", "/calendar", "/pourings"];

export function Shell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user;
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const load = () => {
      fetch("/api/notifications?limit=20")
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d: any[]) => {
          setNotifications(Array.isArray(d) ? d : []);
          setUnreadCount((Array.isArray(d) ? d : []).filter((n) => !n.isRead).length);
        })
        .catch(() => {});
    };
    load();
    const id = setInterval(load, 60000);
    return () => clearInterval(id);
  }, []);

  async function markAllRead() {
    await fetch("/api/notifications/mark-all-read", { method: "POST" });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    setUnreadCount(0);
  }

  const roleLabels: Record<string, string> = {
    admin: "Администратор", manager: "Мениджър", brigadir: "Бригадир", employee: "Служител",
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const isAdmin = (user as any)?.role === "admin";
  const role = (user as any)?.role;
  const visibleNavItems = navItems.filter(item => {
    if (item.adminOnly && !isAdmin) return false;
    if (role === "brigadir" && !brigadirAllowed.includes(item.href)) return false;
    return true;
  });

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:sticky top-0 left-0 z-50 h-screen flex flex-col border-r bg-card transition-all duration-200",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          collapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-2 h-14 px-3 border-b shrink-0 hover:bg-muted/50 transition-colors"
          onClick={() => setSidebarOpen(false)}
        >
          <span className="text-2xl shrink-0">🏗️</span>
          {!collapsed && (
            <span className="font-bold text-sm bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              Beton ERP
            </span>
          )}
        </Link>

        {/* Nav items */}
        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {visibleNavItems.map(item => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive(item.href)
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <span className="text-lg shrink-0">{item.icon}</span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          ))}
        </nav>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex items-center justify-center h-10 border-t text-muted-foreground hover:text-foreground hover:bg-muted transition-colors text-xs"
        >
          {collapsed ? "→" : "← Свий"}
        </button>
      </aside>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header className="sticky top-0 z-30 h-14 border-b bg-card/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
          {/* Hamburger + breadcrumb */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost" size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" />
              </svg>
            </Button>
            <span className="text-sm text-muted-foreground hidden sm:block">
              {visibleNavItems.find(i => isActive(i.href))?.label || "Beton ERP"}
            </span>
          </div>

          {/* User menu + notifications */}
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative h-9 w-9">
                  <span className="text-lg">🔔</span>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-3 py-2 border-b">
                  <span className="text-sm font-medium">Нотификации</span>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-primary hover:underline">
                      Маркирай всички като прочетени
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">Няма нотификации</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className={`px-3 py-2 border-b last:border-0 ${n.isRead ? "opacity-60" : ""}`}>
                        <div className="flex items-start gap-2">
                          <span className="text-sm shrink-0">
                            {n.severity === "critical" ? "🔴" : n.severity === "warning" ? "🟡" : "ℹ️"}
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-medium leading-tight">{n.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{n.message}</p>
                            <p className="text-[10px] text-muted-foreground mt-1">{n.createdAt}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9 px-2">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium shrink-0">
                    {user?.name?.charAt(0) || "?"}
                  </div>
                  <span className="text-sm font-medium max-w-[100px] truncate hidden sm:inline">
                    {user?.name || user?.email}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user?.name}</span>
                    <span className="text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                {(user as any)?.role ? roleLabels[(user as any).role] || (user as any).role : ""}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link href="/settings" className="gap-2">
                  <span>⚙️</span> Настройки
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => signOut({ callbackUrl: "/login" })}>
                🚪 Изход
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
