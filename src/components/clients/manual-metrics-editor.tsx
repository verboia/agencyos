"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import {
  saveManualMetrics,
  type ManualMetricInput,
} from "@/app/(dashboard)/clients/[id]/integrations/actions";

interface Row {
  date: string;
  qualified_leads: number;
  sales_count: number;
  revenue: number;
  spend?: number;
  isToday?: boolean;
}

export function ManualMetricsEditor({
  clientId,
  rows,
}: {
  clientId: string;
  rows: Row[];
}) {
  const [state, setState] = useState<Row[]>(rows);
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function update(date: string, field: keyof Row, value: number) {
    setState((prev) =>
      prev.map((r) => (r.date === date ? { ...r, [field]: Number.isFinite(value) ? value : 0 } : r))
    );
    setDirty((prev) => new Set(prev).add(date));
  }

  function save() {
    if (dirty.size === 0) {
      toast({ title: "Nenhuma alteração para salvar" });
      return;
    }
    const entries: ManualMetricInput[] = state
      .filter((r) => dirty.has(r.date))
      .map((r) => ({
        date: r.date,
        qualified_leads: r.qualified_leads,
        sales_count: r.sales_count,
        revenue: r.revenue,
      }));

    startTransition(async () => {
      try {
        const result = await saveManualMetrics(clientId, entries);
        toast({
          title: `${result.saved} dia${result.saved === 1 ? "" : "s"} atualizado${result.saved === 1 ? "" : "s"}`,
        });
        setDirty(new Set());
      } catch (err) {
        toast({
          title: "Erro ao salvar",
          description: String(err).slice(0, 200),
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-slate-200">
              <th className="text-left py-2 pr-2 font-medium">Dia</th>
              <th className="text-right py-2 px-2 font-medium">Investido</th>
              <th className="text-right py-2 px-2 font-medium w-24">Leads qualif.</th>
              <th className="text-right py-2 px-2 font-medium w-24">Vendas</th>
              <th className="text-right py-2 pl-2 font-medium w-32">Receita (R$)</th>
            </tr>
          </thead>
          <tbody>
            {state.map((r) => (
              <tr
                key={r.date}
                className={`border-b border-slate-100 ${r.isToday ? "bg-blue-50/40" : ""}`}
              >
                <td className="py-2 pr-2">
                  {formatDate(r.date)}
                  {r.isToday && <span className="ml-1 text-xs text-blue-600">(hoje)</span>}
                </td>
                <td className="text-right py-2 px-2 text-muted-foreground">
                  {r.spend !== undefined ? `R$ ${r.spend.toFixed(2)}` : "—"}
                </td>
                <td className="py-2 px-2">
                  <Input
                    type="number"
                    min={0}
                    value={r.qualified_leads || ""}
                    onChange={(e) => update(r.date, "qualified_leads", Number(e.target.value))}
                    className="h-8 text-right text-sm"
                  />
                </td>
                <td className="py-2 px-2">
                  <Input
                    type="number"
                    min={0}
                    value={r.sales_count || ""}
                    onChange={(e) => update(r.date, "sales_count", Number(e.target.value))}
                    className="h-8 text-right text-sm"
                  />
                </td>
                <td className="py-2 pl-2">
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={r.revenue || ""}
                    onChange={(e) => update(r.date, "revenue", Number(e.target.value))}
                    className="h-8 text-right text-sm"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-muted-foreground">
          {dirty.size > 0
            ? `${dirty.size} dia${dirty.size === 1 ? "" : "s"} com alterações`
            : "Nenhuma alteração"}
        </span>
        <Button onClick={save} disabled={pending || dirty.size === 0} size="sm">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Salvando…
            </>
          ) : (
            <>
              <Save className="h-4 w-4" /> Salvar alterações
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
