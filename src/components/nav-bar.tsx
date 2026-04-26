"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  match: (path: string) => boolean;
  suffix?: React.ReactNode;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/dashboard/sales",
    label: "Sales",
    match: (p) => p.startsWith("/dashboard/sales"),
  },
  {
    href: "/dashboard/planning",
    label: "Planning",
    match: (p) => p.startsWith("/dashboard/planning"),
  },
];

export function NavBar({ lastSyncedLabel }: { lastSyncedLabel?: string }) {
  const pathname = usePathname() ?? "";
  const { data: session } = useSession();
  const initials = (session?.user?.name ?? session?.user?.email ?? "?")
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-[1440px] items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link
            href="/dashboard/sales"
            className="font-semibold tracking-tight"
          >
            Command Center
          </Link>
          <nav className="flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = item.match(pathname);
              const isSales = item.href === "/dashboard/sales";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative px-3 py-2 text-sm transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <span>{item.label}</span>
                  {isSales && lastSyncedLabel && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      · {lastSyncedLabel}
                    </span>
                  )}
                  {active && (
                    <span className="absolute inset-x-3 -bottom-px h-0.5 bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-muted-foreground"
            // Search wiring lands in Phase 4 — Cmd+K hotkey + /api/search.
            disabled
          >
            <Search className="h-4 w-4" />
            <span>Search</span>
            <kbd className="ml-2 hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-mono sm:inline">
              ⌘K
            </kbd>
          </Button>

          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full"
                aria-label="Account menu"
              >
                <Avatar className="h-8 w-8">
                  {session?.user?.image && (
                    <AvatarImage
                      src={session.user.image}
                      alt={session.user.name ?? "User"}
                    />
                  )}
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col">
                <span className="text-sm font-medium">
                  {session?.user?.name ?? "Signed in"}
                </span>
                <span className="text-xs font-normal text-muted-foreground">
                  {session?.user?.email}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
