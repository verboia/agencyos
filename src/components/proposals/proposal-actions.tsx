"use client";

import { Button } from "@/components/ui/button";
import { Send, Copy, ExternalLink } from "lucide-react";
import { sendProposal } from "@/app/(dashboard)/proposals/actions";
import { useToast } from "@/components/ui/use-toast";
import { useState } from "react";
import type { Proposal } from "@/types/database";

export function ProposalActions({ proposal, portalUrl }: { proposal: Proposal; portalUrl: string }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  async function send() {
    setLoading(true);
    const result = await sendProposal(proposal.id);
    if (result?.error) toast({ title: "Erro", description: result.error, variant: "destructive" });
    else toast({ title: "Proposta marcada como enviada" });
    setLoading(false);
  }

  async function copy() {
    await navigator.clipboard.writeText(portalUrl);
    toast({ title: "Link copiado" });
  }

  return (
    <div className="flex gap-2 flex-wrap">
      <Button variant="outline" size="sm" onClick={copy}>
        <Copy className="h-4 w-4" /> Link
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={portalUrl} target="_blank" rel="noreferrer">
          <ExternalLink className="h-4 w-4" /> Abrir
        </a>
      </Button>
      {proposal.status === "draft" && (
        <Button size="sm" onClick={send} disabled={loading}>
          <Send className="h-4 w-4" /> Marcar como enviada
        </Button>
      )}
    </div>
  );
}
