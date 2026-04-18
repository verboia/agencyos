"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, Loader2 } from "lucide-react";
import { ASSET_CATEGORIES } from "@/lib/utils/constants";
import { uploadAsset } from "@/app/(dashboard)/clients/[id]/assets/actions";
import { useToast } from "@/components/ui/use-toast";

export function AssetUploader({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<string>("creative");
  const [tags, setTags] = useState("");
  const [requireApproval, setRequireApproval] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.set("file", file);
        fd.set("category", category);
        fd.set("tags", tags);
        fd.set("require_approval", requireApproval ? "1" : "0");
        const result = await uploadAsset(clientId, fd);
        if (result?.error) {
          toast({ title: "Erro no upload", description: result.error, variant: "destructive" });
        }
      }
      toast({ title: "Upload concluído", description: `${files.length} arquivo(s) enviado(s).` });
    } finally {
      setLoading(false);
      if (ref.current) ref.current.value = "";
    }
  }

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Categoria</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ASSET_CATEGORIES).map(([key, v]) => (
                  <SelectItem key={key} value={key}>
                    {v.emoji} {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Tags (vírgula separadas)</Label>
            <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="stories, campanha-junho" />
          </div>
          <div className="space-y-1.5">
            <Label>Requer aprovação</Label>
            <div className="flex items-center gap-2 h-10">
              <input
                type="checkbox"
                checked={requireApproval}
                onChange={(e) => setRequireApproval(e.target.checked)}
                className="h-4 w-4"
              />
              <span className="text-sm text-muted-foreground">Cliente aprova no portal</span>
            </div>
          </div>
        </div>
        <div>
          <input
            type="file"
            multiple
            ref={ref}
            onChange={(e) => handleFiles(e.target.files)}
            className="hidden"
          />
          <Button
            variant="outline"
            className="w-full"
            disabled={loading}
            onClick={() => ref.current?.click()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? "Enviando…" : "Adicionar arquivos"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
