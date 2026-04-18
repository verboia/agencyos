"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { syncClientMetaMetrics } from "@/app/(dashboard)/clients/[id]/integrations/actions";

const RANGE_OPTIONS = [
  { value: 7, label: "7 dias" },
  { value: 14, label: "14 dias" },
  { value: 30, label: "30 dias" },
  { value: 60, label: "60 dias" },
  { value: 90, label: "90 dias" },
];

export function SyncMetaButton({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();
  const [daysBack, setDaysBack] = useState(7);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const { toast } = useToast();

  function run() {
    startTransition(async () => {
      try {
        const result = await syncClientMetaMetrics(clientId, daysBack);
        if (result.total === 0) {
          toast({
            title: "Nenhuma conta conectada",
            description: "Conecte o Meta Ads pelo portal antes de sincronizar.",
            variant: "destructive",
          });
          return;
        }
        const msg = `${result.synced}/${result.total} conta${result.total === 1 ? "" : "s"} sincronizada${result.total === 1 ? "" : "s"} · ${result.days.since} → ${result.days.until}`;
        setLastResult(msg);
        if (result.failed > 0) {
          toast({
            title: `Sincronização com falhas (${result.failed})`,
            description: result.errors[0]?.error.slice(0, 120) ?? "Veja os logs.",
            variant: "destructive",
          });
        } else {
          toast({ title: "Métricas atualizadas", description: msg });
        }
      } catch (err) {
        toast({
          title: "Erro ao sincronizar",
          description: String(err).slice(0, 200),
          variant: "destructive",
        });
      }
    });
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <select
          value={daysBack}
          onChange={(e) => setDaysBack(Number(e.target.value))}
          disabled={pending}
          className="text-sm h-9 rounded-md border border-input bg-background px-2 focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {RANGE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <Button onClick={run} disabled={pending} size="sm" variant="outline">
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Sincronizando…
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" /> Sincronizar
            </>
          )}
        </Button>
      </div>
      {lastResult && <p className="text-xs text-muted-foreground">{lastResult}</p>}
    </div>
  );
}
