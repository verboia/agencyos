"use client";

import { Button } from "@/components/ui/button";
import { Send, CheckCircle2, Sparkles, MessageCircle } from "lucide-react";
import { publishReport, markReportSent } from "@/app/(dashboard)/reports/actions";
import { runAiAnalysis, sendReportWhatsApp } from "@/app/(dashboard)/reports/ai-actions";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import type { PerformanceReport } from "@/types/database";

export function ReportActions({ report }: { report: PerformanceReport }) {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  async function wrap(
    key: string,
    fn: () => Promise<{ error?: string; success?: boolean } | void>,
    successMsg: string
  ) {
    setLoading(key);
    const result = await fn();
    if (result && "error" in result && result.error) {
      toast({ title: "Aviso", description: result.error, variant: "destructive" });
    } else {
      toast({ title: successMsg });
    }
    setLoading(null);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button
        variant="outline"
        onClick={() => wrap("ai", () => runAiAnalysis(report.id), "Análise gerada")}
        disabled={!!loading}
      >
        <Sparkles className="h-4 w-4" /> {loading === "ai" ? "Gerando…" : "Análise IA"}
      </Button>
      {report.status === "draft" && (
        <Button
          onClick={() => wrap("pub", () => publishReport(report.id), "Relatório publicado")}
          disabled={!!loading}
        >
          <CheckCircle2 className="h-4 w-4" /> Publicar
        </Button>
      )}
      {report.status === "published" && (
        <>
          <Button
            variant="outline"
            onClick={() => wrap("wa", () => sendReportWhatsApp(report.id), "Enviado via WhatsApp")}
            disabled={!!loading}
          >
            <MessageCircle className="h-4 w-4" /> WhatsApp
          </Button>
          <Button
            onClick={() => wrap("sent", () => markReportSent(report.id), "Marcado como enviado")}
            disabled={!!loading}
          >
            <Send className="h-4 w-4" /> Marcar enviado
          </Button>
        </>
      )}
    </div>
  );
}
