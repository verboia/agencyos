"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ListChecks, Receipt, FileText } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/", icon: LayoutDashboard, label: "Início" },
  { href: "/clients", icon: Users, label: "Clientes" },
  { href: "/tasks", icon: ListChecks, label: "Tarefas" },
  { href: "/billing", icon: Receipt, label: "Financeiro" },
  { href: "/reports", icon: FileText, label: "Relatórios" },
];

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 h-16 bg-card border-t border-border z-40">
      <div className="grid grid-cols-5 h-full">
        {ITEMS.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 text-xs",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
