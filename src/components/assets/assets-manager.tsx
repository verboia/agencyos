"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ASSET_CATEGORIES } from "@/lib/utils/constants";
import { AssetUploader } from "./asset-uploader";
import type { ClientAsset } from "@/types/database";
import { formatDate } from "@/lib/utils/format";

export function AssetsManager({ clientId, assets }: { clientId: string; assets: ClientAsset[] }) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = assets.filter((a) => {
    const matchesCategory = category === "all" || a.category === category;
    const matchesSearch =
      !search ||
      a.file_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.description ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (a.tags ?? []).some((t) => t.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-4">
      <AssetUploader clientId={clientId} />

      <div className="flex flex-col md:flex-row gap-2">
        <Input placeholder="Buscar…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="md:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as categorias</SelectItem>
            {Object.entries(ASSET_CATEGORIES).map(([key, v]) => (
              <SelectItem key={key} value={key}>
                {v.emoji} {v.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum asset encontrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((a) => {
            const isImage = a.file_type?.startsWith("image/");
            return (
              <Card key={a.id} className="overflow-hidden">
                <div className="aspect-square bg-muted flex items-center justify-center">
                  {isImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.thumbnail_url ?? a.file_url} alt={a.file_name} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-4xl">
                      {ASSET_CATEGORIES[a.category as keyof typeof ASSET_CATEGORIES]?.emoji ?? "📄"}
                    </span>
                  )}
                </div>
                <CardContent className="p-3 space-y-1">
                  <div className="text-xs font-medium truncate">{a.file_name}</div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{formatDate(a.created_at)}</span>
                    {a.approval_status === "pending" && <Badge variant="warning" className="text-[10px]">Aguardando</Badge>}
                    {a.approval_status === "approved" && <Badge variant="success" className="text-[10px]">Aprovado</Badge>}
                    {a.approval_status === "rejected" && <Badge variant="destructive" className="text-[10px]">Rejeitado</Badge>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
