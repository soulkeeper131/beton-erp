"use client";

import { useState } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const mainItems = [
  { href: "/", label: "Табло", icon: "🏠" },
  { href: "/clients", label: "Клиенти", icon: "👥" },
  { href: "/sites", label: "Обекти", icon: "🏗️" },
  { href: "/offers", label: "Оферти", icon: "📋" },
  { href: "/pourings", label: "Актуване", icon: "🪣" },
];

const moreItems = [
  { href: "/machines", label: "Машини", icon: "🚛" },
  { href: "/workers", label: "Работници", icon: "👷" },
  { href: "/materials", label: "Склад", icon: "📦" },
  { href: "/invoices", label: "Фактури", icon: "🧾" },
  { href: "/services", label: "Услуги", icon: "🔧" },
  { href: "/concrete-types", label: "Типове бетон", icon: "🧱" },
  { href: "/audit-log", label: "Одит лог", icon: "📋" },
  { href: "/settings", label: "Настройки", icon: "⚙️" },
];

// Combined for mobile
const allItems = [...mainItems, ...moreItems];

export function Shell({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const user = session?.user;
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const roleLabels: Record<string, string> = {
    admin: "Администратор", manager: "Мениджър", brigadir: "Бригадир",
  };

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  const moreActive = moreItems.some(i => isActive(i.href));

  const NavLink = ({ item, onClick }: { item: typeof allItems[0]; onClick?: () => void }) => (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
        isActive(item.href)
          ? "bg-primary/10 text-primary font-medium"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span className="text-base">{item.icon}</span>
      <span>{item.label}</span>
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/80 backdrop-blur-sm">
        <div className="flex h-14 items-center justify-between px-4 max-w-7xl mx-auto w-full gap-2">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg shrink-0 hover:opacity-80 transition-opacity">
            <span className="text-2xl">🏗️</span>
            <span className="hidden sm:inline bg-gradient-to-r from-orange-500 to-amber-500 bg-clip-text text-transparent">
              Beton ERP
            </span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {mainItems.map(item => <NavLink key={item.href} item={item} />)}
            
            {/* More dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "gap-1 text-sm",
                    moreActive && "bg-primary/10 text-primary font-medium"
                  )}
                >
                  <span>Още</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                {moreItems.map(item => (
                  <DropdownMenuItem key={item.href} asChild>
                    <Link href={item.href} className={cn(
                      "gap-2 cursor-pointer",
                      isActive(item.href) && "bg-primary/10 text-primary font-medium"
                    )}>
                      <span>{item.icon}</span>
                      <span>{item.label}</span>
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Mobile hamburger */}
            <Button
              variant="ghost" size="icon"
              className="md:hidden order-first"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Меню"
            >
              {mobileMenuOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16" /><path d="M4 12h16" /><path d="M4 18h16" /></svg>
              )}
            </Button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 h-9 px-3">
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                    {user?.name?.charAt(0) || "?"}
                  </div>
                  <span className="text-sm font-medium max-w-[120px] truncate hidden sm:inline">
                    {user?.name || user?.email}
                  </span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 hidden sm:block">
                    <path d="m6 9 6 6 6-6" />
                  </svg>
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
                <DropdownMenuItem className="text-destructive cursor-pointer" onClick={() => signOut({ callbackUrl: "/login" })}>
                  🚪 Изход
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t bg-card px-4 py-2">
            <div className="flex flex-col gap-1">
              {allItems.map(item => (
                <NavLink key={item.href} item={item} onClick={() => setMobileMenuOpen(false)} />
              ))}
              <div className="border-t pt-2 mt-1">
                <div className="px-3 py-1">
                  <div className="font-medium text-sm">{user?.name}</div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {(user as any)?.role ? roleLabels[(user as any).role] || (user as any).role : ""}
                  </div>
                </div>
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-muted rounded-md mt-1"
                >
                  🚪 Изход
                </button>
              </div>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full">{children}</main>
    </div>
  );
}
