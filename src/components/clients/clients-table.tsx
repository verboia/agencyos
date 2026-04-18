"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ClientStatusBadge } from "./client-status-badge";
import { formatCurrency, formatPhone } from "@/lib/utils/format";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Client } from "@/types/database";

type ClientWithProfile = Client & { assigned_profile?: { full_name: string } | null };

export function ClientsTable({ clients }: { clients: ClientWithProfile[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");

  const filtered = useMemo(() => {
    return clients.filter((c) => {
      const matchesSearch =
        !search ||
        c.company_name.toLowerCase().includes(search.toLowerCase()) ||
        c.contact_name.toLowerCase().includes(search.toLowerCase()) ||
        (c.contact_phone ?? "").includes(search);
      const matchesStatus = status === "all" || c.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [clients, search, status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por empresa, contato ou telefone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="onboarding">Onboarding</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="paused">Pausados</SelectItem>
            <SelectItem value="churned">Churn</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card className="p-12 text-center text-sm text-muted-foreground">
          Nenhum cliente encontrado.
        </Card>
      ) : (
        <div className="grid gap-3">
          {filtered.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`}>
              <Card className="p-4 hover:bg-accent transition-colors cursor-pointer">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{c.company_name}</h3>
                      <ClientStatusBadge status={c.status} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {c.contact_name} · {formatPhone(c.contact_phone)}
                      {c.segment && ` · ${c.segment}`}
                    </p>
                    {c.status === "onboarding" && (
                      <div className="mt-2 max-w-sm">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                          <span>Onboarding</span>
                          <span>{c.onboarding_progress}%</span>
                        </div>
                        <Progress value={c.onboarding_progress} className="h-1.5" />
                      </div>
                    )}
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-semibold">{formatCurrency(c.monthly_fee)}/mês</div>
                    <div className="text-xs text-muted-foreground">
                      {c.assigned_profile?.full_name ?? "Sem responsável"}
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
