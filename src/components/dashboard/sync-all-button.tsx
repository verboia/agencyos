"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, RefreshCw } from "lucide-react";
import { syncAllMetaIntegrations } from "@/app/(dashboard)/actions";

export function SyncAllButton() {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function run() {
    startTransition(async () => {
      try {
        const result = await syncAllMetaIntegrations();
        if (result.total === 0) {
          toast({
            title: "Nenhuma conta para sincronizar",
            description: "Nenhum cliente tem conta Meta Ads conectada.",
          });
          return;
        }
        const msg = `${result.synced}/${result.total} conta${result.total === 1 ? "" : "s"}`;
        if (result.failed > 0) {
          toast({
            title: `${result.failed} falha${result.failed === 1 ? "" : "s"} no sync`,
            description: `${msg} sincronizada${result.synced === 1 ? "" : "s"}. Veja a lista.`,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Sincronização concluída",
            description: `${msg} atualizada${result.synced === 1 ? "" : "s"} (${result.days.since} → ${result.days.until}).`,
          });
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
    <Button onClick={run} disabled={pending} variant="outline" size="sm">
      {pending ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" /> Sincronizando…
        </>
      ) : (
        <>
          <RefreshCw className="h-4 w-4" /> Sincronizar tudo
        </>
      )}
    </Button>
  );
}
