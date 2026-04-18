"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ListChecks,
  FileText,
  Receipt,
  FileSignature,
  BarChart3,
  Settings,
  Briefcase,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Profile } from "@/types/database";

const NAV_ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/clients", icon: Users, label: "Clientes" },
  { href: "/tasks", icon: ListChecks, label: "Tarefas" },
  { href: "/contracts", icon: FileSignature, label: "Contratos" },
  { href: "/proposals", icon: FileText, label: "Propostas" },
  { href: "/billing", icon: Receipt, label: "Financeiro" },
  { href: "/reports", icon: BarChart3, label: "Relatórios" },
  { href: "/performance", icon: TrendingUp, label: "Performance" },
];

export function Sidebar({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex w-64 flex-col border-r border-border bg-card">
      <div className="h-16 flex items-center gap-3 px-6 border-b border-border">
        <div className="w-9 h-9 rounded-lg bg-adria flex items-center justify-center text-white font-bold">
          A
        </div>
        <div>
          <div className="font-semibold leading-none">AgencyOS</div>
          <div className="text-xs text-muted-foreground mt-0.5">Adria</div>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary/15 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {profile?.role === "admin" && (
        <div className="p-3 border-t border-border">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm",
              pathname.startsWith("/settings")
                ? "bg-primary/15 text-primary font-medium"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            )}
          >
            <Settings className="h-4 w-4" />
            Configurações
          </Link>
        </div>
      )}
    </aside>
  );
}
