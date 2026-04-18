"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, Loader2 } from "lucide-react";
import { uploadAssetAsClient } from "@/app/portal/[token]/assets/actions";
import { useToast } from "@/components/ui/use-toast";

export function ClientAssetUploader({ token }: { token: string }) {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>("photo");
  const ref = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setLoading(true);
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("category", category);
      const result = await uploadAssetAsClient(token, fd);
      if (result?.error) {
        toast({ title: "Erro", description: result.error, variant: "destructive" });
      }
    }
    toast({ title: "Arquivos enviados!", description: "A equipe foi notificada." });
    setLoading(false);
    if (ref.current) ref.current.value = "";
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-3">
      <Label className="font-medium">Tipo de material</Label>
      <div className="flex gap-2 flex-wrap">
        {[
          { id: "logo", label: "🎨 Logo" },
          { id: "photo", label: "📸 Fotos" },
          { id: "video", label: "🎬 Vídeo" },
          { id: "brand_guide", label: "📘 Manual" },
          { id: "other", label: "📦 Outro" },
        ].map((c) => (
          <button
            key={c.id}
            onClick={() => setCategory(c.id)}
            className={`px-3 py-1.5 rounded-md text-sm ${category === c.id ? "bg-adria text-white" : "bg-slate-100 text-slate-700"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <input
        type="file"
        ref={ref}
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        variant="outline"
        className="w-full"
        onClick={() => ref.current?.click()}
        disabled={loading}
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
        {loading ? "Enviando…" : "Escolher arquivos"}
      </Button>
    </div>
  );
}
