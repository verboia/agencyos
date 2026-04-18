"use client";

import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export function CopyConnectLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast({ title: "Link copiado" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Não consegui copiar", variant: "destructive" });
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={copy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Copiado" : "Copiar link"}
    </Button>
  );
}
