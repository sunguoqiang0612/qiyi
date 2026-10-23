"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  BarChart3,
  Bell,
  History,
  Layers,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Settings,
  Shirt,
  Sparkles,
  Sun,
  Users,
} from "lucide-react";
import { api } from "@/lib/client";
import type { MessageKey } from "@/lib/i18n";
import type { ShellUser } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useI18n } from "@/components/i18n-provider";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";

const primary: { href: string; key: MessageKey; icon: typeof Shirt }[] = [
  { href: "/dashboard", key: "navDashboard", icon: LayoutDashboard },
  { href: "/wardrobe", key: "navWardrobe", icon: Shirt },
  { href: "/suggest", key: "navSuggest", icon: Sparkles },
  { href: "/outfits", key: "navOutfits", icon: Layers },
  { href: "/history", key: "navHistory", icon: History },
  { href: "/analytics", key: "navAnalytics", icon: BarChart3 },
];

const secondary: { href: string; key: MessageKey; icon: typeof Shirt }[] = [
  { href: "/family", key: "navFamily", icon: Users },
  { href: "/notifications", key: "navNotifications", icon: Bell },
  { href: "/settings", key: "navSettings", icon: Settings },
];

function mark(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "栖";
  return trimmed.slice(0, 2);
}

export function AppShell({
  user,
  unread,
  children,
}: {
  user: ShellUser;
  unread: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);

  async function activate(profileId: string) {
    if (profileId === user.activeProfileId) return;
    await api(`/api/profiles/${profileId}/activate`, { method: "POST" });
    router.refresh();
  }

  async function logout() {
    await api("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function toggleTheme() {
    const next = resolvedTheme === "dark" ? "light" : "dark";
    setTheme(next);
    void api("/api/settings", { method: "PATCH", body: JSON.stringify({ theme: next }) });
  }

  const nav = (
    <div className="flex h-full flex-col bg-[#16181d] text-[#f4f1eb]">
      <Link href="/wardrobe" className="flex items-center gap-2.5 px-4 py-5" onClick={() => setOpen(false)}>
        <span className="grid size-8 place-items-center rounded-lg bg-white text-[#16181d]">
          <Shirt className="size-4" />
        </span>
        <span>
          <span className="block text-base font-semibold leading-none">{t("appName")}</span>
          <span className="mt-1 block text-[11px] text-white/45">{t("tagline")}</span>
        </span>
      </Link>
      <nav className="flex flex-1 flex-col gap-1 px-3">
        {primary.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} label={t(item.key)} onNavigate={() => setOpen(false)} />
        ))}
        <div className="mt-5 mb-1 px-3 text-[11px] tracking-wide text-white/35">{t("sectionManage")}</div>
        {secondary.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            label={t(item.key)}
            badge={item.href === "/notifications" ? unread : 0}
            onNavigate={() => setOpen(false)}
          />
        ))}
      </nav>
      <div className="border-t border-white/10 p-3">
        <div className="mb-1.5 px-1 text-[11px] text-white/40">{t("currentMember")}</div>
        <select
          value={user.activeProfileId}
          onChange={(event) => void activate(event.target.value)}
          className="w-full rounded-lg border border-white/10 bg-[#23262d] px-2 py-2 text-sm outline-none"
          aria-label={t("currentMember")}
        >
          {user.profiles.map((profile) => (
            <option key={profile.id} value={profile.id}>
              {profile.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-[232px] shrink-0 md:block">{nav}</aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/85 px-4 backdrop-blur md:px-8">
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label={t("openMenu")}>
            <Menu />
          </Button>
          <div className="hidden text-sm text-muted-foreground md:block">{user.profiles.find((profile) => profile.id === user.activeProfileId)?.name}</div>
          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label={resolvedTheme === "dark" ? t("themeToLight") : t("themeToDark")}>
              {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <Link
              href="/notifications"
              className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "relative")}
              aria-label={t("navNotifications")}
            >
              <Bell />
              {unread > 0 ? (
                <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-amber-600 px-1 text-[10px] text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                className="ml-1 flex items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 text-sm"
                aria-label={t("userMenu")}
              >
                <span className="grid size-7 place-items-center rounded-full bg-[#16181d] text-[11px] text-white">{mark(user.name)}</span>
                <span className="max-w-28 truncate">{user.name}</span>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuLabel className="text-sm text-foreground">
                  <div className="truncate">{user.name}</div>
                  <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/settings")}>{t("navSettings")}</DropdownMenuItem>
                <DropdownMenuItem onClick={() => void logout()}>
                  <LogOut />
                  {t("logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-[260px] bg-[#16181d] p-0 text-[#f4f1eb] sm:max-w-[260px]" showCloseButton={false}>
          <SheetTitle className="sr-only">{t("menu")}</SheetTitle>
          {nav}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function NavLink({
  item,
  pathname,
  label,
  badge = 0,
  onNavigate,
}: {
  item: { href: string; icon: typeof Shirt };
  pathname: string;
  label: string;
  badge?: number;
  onNavigate: () => void;
}) {
  const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/70 hover:bg-white/6 hover:text-white",
        active && "bg-white font-medium text-[#16181d] hover:bg-white hover:text-[#16181d]",
      )}
    >
      <Icon className="size-4" />
      <span className="flex-1">{label}</span>
      {badge > 0 ? <span className={cn("rounded-full px-1.5 text-[10px]", active ? "bg-[#16181d] text-white" : "bg-amber-500 text-white")}>{badge}</span> : null}
    </Link>
  );
}
