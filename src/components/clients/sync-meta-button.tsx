"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { syncClientMetaMetrics } from "@/app/(dashboard)/clients/[id]/integrations/actions";

export function SyncMetaButton({ clientId }: { clientId: string }) {
  const [pending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<string | null>(null);
  const { toast } = useToast();

  function run() {
    startTransition(async () => {
      try {
        const result = await syncClientMetaMetrics(clientId, 7);
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
      <Button onClick={run} disabled={pending} size="sm" variant="outline">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sincronizando…
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" /> Sincronizar agora (7 dias)
          </>
        )}
      </Button>
      {lastResult && <p className="text-xs text-muted-foreground">{lastResult}</p>}
    </div>
  );
}
