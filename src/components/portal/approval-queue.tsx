"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, X } from "lucide-react";
import { respondToApproval } from "@/app/portal/[token]/assets/actions";
import { useToast } from "@/components/ui/use-toast";
import type { ClientAsset } from "@/types/database";

export function ApprovalQueue({ token, assets }: { token: string; assets: ClientAsset[] }) {
  const [list, setList] = useState(assets);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  async function approve(id: string) {
    setLoading(id);
    const result = await respondToApproval(token, id, true);
    if (result?.error) toast({ title: "Erro", description: result.error, variant: "destructive" });
    else {
      setList((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Aprovado! ✅" });
    }
    setLoading(null);
  }

  async function reject(id: string) {
    setLoading(id);
    const result = await respondToApproval(token, id, false, note);
    if (result?.error) toast({ title: "Erro", description: result.error, variant: "destructive" });
    else {
      setList((prev) => prev.filter((a) => a.id !== id));
      toast({ title: "Retorno registrado" });
      setRejectingId(null);
      setNote("");
    }
    setLoading(null);
  }

  if (list.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 text-center">
        <div className="text-4xl">🎉</div>
        <p className="text-sm text-slate-600 mt-2">Nada pendente no momento.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {list.map((a) => {
        const isImage = a.file_type?.startsWith("image/");
        return (
          <div key={a.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            {isImage && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={a.thumbnail_url ?? a.file_url} alt={a.file_name} className="w-full max-h-96 object-contain bg-slate-50" />
            )}
            <div className="p-4 space-y-3">
              <div>
                <div className="font-medium">{a.file_name}</div>
                {a.description && <div className="text-xs text-slate-500 mt-1">{a.description}</div>}
              </div>
              {rejectingId === a.id ? (
                <>
                  <Textarea
                    placeholder="Conte o que precisa ajustar…"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setRejectingId(null)}>
                      Cancelar
                    </Button>
                    <Button variant="destructive" onClick={() => reject(a.id)} disabled={!note || loading === a.id}>
                      Enviar ajustes
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setRejectingId(a.id)}
                  >
                    <X className="h-4 w-4" /> Pedir ajustes
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => approve(a.id)}
                    disabled={loading === a.id}
                  >
                    <Check className="h-4 w-4" /> Aprovar
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
