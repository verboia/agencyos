"use client";

import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export function PortalLinkButton({ url }: { url: string }) {
  const { toast } = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copiado", description: "Link do portal na área de transferência." });
    } catch {
      toast({ title: "Erro ao copiar", variant: "destructive" });
    }
  }

  return (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={copy}>
        <Copy className="h-4 w-4" />
        Copiar link
      </Button>
      <Button variant="outline" size="sm" asChild>
        <a href={url} target="_blank" rel="noreferrer">
          <ExternalLink className="h-4 w-4" />
          Abrir portal
        </a>
      </Button>
    </div>
  );
}
