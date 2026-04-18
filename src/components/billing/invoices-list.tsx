"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { INVOICE_STATUS } from "@/lib/utils/constants";
import { Search } from "lucide-react";
import type { BillingInvoice } from "@/types/database";

type InvoiceWithClient = BillingInvoice & { client?: { company_name: string } | null };

export function InvoicesList({ invoices }: { invoices: InvoiceWithClient[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const filtered = invoices.filter((inv) => {
    const clientName = inv.client?.company_name ?? "";
    const matchesSearch = !search || clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = status === "all" || inv.status === status;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="md:w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="received">Paga</SelectItem>
            <SelectItem value="overdue">Vencida</SelectItem>
            <SelectItem value="refunded">Estornada</SelectItem>
            <SelectItem value="cancelled">Cancelada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma cobrança encontrada.</p>
      ) : (
        <div className="space-y-2">
          {filtered.map((inv) => {
            const cfg = INVOICE_STATUS[inv.status as keyof typeof INVOICE_STATUS];
            const clientName = inv.client?.company_name ?? "—";
            return (
              <Link key={inv.id} href={`/clients/${inv.client_id}/billing`}>
                <div className="flex items-center justify-between gap-4 p-3 rounded-md border border-border hover:bg-accent transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{clientName}</div>
                    <div className="text-xs text-muted-foreground">
                      {inv.description ?? "Cobrança"} · Venc. {formatDate(inv.due_date)}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-semibold">{formatCurrency(inv.net_value)}</div>
                    <Badge variant="outline">{cfg?.label ?? inv.status}</Badge>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
