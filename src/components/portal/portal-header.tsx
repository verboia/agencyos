"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function PortalHeader({ clientName, token }: { clientName: string; token: string }) {
  const pathname = usePathname();
  const base = `/portal/${token}`;
  const links = [
    { href: base, label: "Início" },
    { href: `${base}/briefing`, label: "Briefing" },
    { href: `${base}/contract`, label: "Contrato" },
    { href: `${base}/billing`, label: "Financeiro" },
    { href: `${base}/reports`, label: "Relatórios" },
    { href: `${base}/assets`, label: "Materiais" },
  ];

  return (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-adria flex items-center justify-center text-white font-bold">A</div>
          <div>
            <div className="text-xs text-slate-500">Adria · Portal do cliente</div>
            <div className="font-semibold">{clientName}</div>
          </div>
        </div>
      </div>
      <nav className="max-w-3xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto scrollbar-thin">
        {links.map((l) => {
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap transition-colors ${active ? "bg-adria text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {l.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
