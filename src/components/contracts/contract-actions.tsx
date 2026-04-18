"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send, Copy, FileText, Loader2 } from "lucide-react";
import { sendContractToClient, cancelContract } from "@/app/(dashboard)/contracts/actions";
import { useToast } from "@/components/ui/use-toast";
import type { Contract } from "@/types/database";

export function ContractActions({ contract, portalUrl }: { contract: Contract; portalUrl: string | null }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  async function generatePdf() {
    setGenerating(true);
    try {
      const res = await fetch(`/api/contracts/${contract.id}/pdf`, { cache: "no-store" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Falha ao gerar PDF");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      toast({ title: "PDF gerado", description: "O contrato foi salvo e aberto em nova aba." });
    } catch (e) {
      toast({
        title: "Erro ao gerar PDF",
        description: e instanceof Error ? e.message : String(e),
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  }

  async function send() {
    setLoading(true);
    const result = await sendContractToClient(contract.id);
    if (result?.error) toast({ title: "Erro", description: result.error, variant: "destructive" });
    else toast({ title: "Contrato marcado como enviado" });
    setLoading(false);
  }

  async function copy() {
    if (!portalUrl) return;
    await navigator.clipboard.writeText(portalUrl);
    toast({ title: "Link copiado" });
  }

  async function cancel() {
    if (!confirm("Cancelar este contrato?")) return;
    setLoading(true);
    await cancelContract(contract.id);
    toast({ title: "Contrato cancelado" });
    setLoading(false);
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {portalUrl && (
        <Button variant="outline" size="sm" onClick={copy}>
          <Copy className="h-4 w-4" /> Link do contrato
        </Button>
      )}
      {contract.status === "draft" && (
        <Button size="sm" onClick={send} disabled={loading}>
          <Send className="h-4 w-4" /> Enviar ao cliente
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={generatePdf} disabled={generating}>
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
        {contract.pdf_url ? "Gerar PDF novamente" : "Gerar PDF"}
      </Button>
      {contract.pdf_url && (
        <Button variant="ghost" size="sm" asChild>
          <a href={contract.pdf_url} target="_blank" rel="noreferrer">
            <FileText className="h-4 w-4" /> Último PDF
          </a>
        </Button>
      )}
      {!["signed", "cancelled"].includes(contract.status) && (
        <Button variant="ghost" size="sm" onClick={cancel} disabled={loading} className="text-destructive">
          Cancelar
        </Button>
      )}
    </div>
  );
}
