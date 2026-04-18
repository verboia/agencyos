"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils/format";
import { createService, deleteService, updateService } from "@/app/(dashboard)/contracts/catalog/actions";
import { useToast } from "@/components/ui/use-toast";
import type { ServiceCatalog } from "@/types/database";
import { Plus, Pencil, Trash2 } from "lucide-react";

export function ServiceCatalogManager({ services }: { services: ServiceCatalog[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ServiceCatalog | null>(null);
  const [category, setCategory] = useState("recurring");
  const [priceType, setPriceType] = useState("monthly");
  const { toast } = useToast();

  function openNew() {
    setEditing(null);
    setCategory("recurring");
    setPriceType("monthly");
    setOpen(true);
  }

  function openEdit(s: ServiceCatalog) {
    setEditing(s);
    setCategory(s.category);
    setPriceType(s.price_type);
    setOpen(true);
  }

  async function handleSubmit(formData: FormData) {
    formData.set("category", category);
    formData.set("price_type", priceType);
    const result = editing
      ? await updateService(editing.id, formData)
      : await createService(formData);
    if (result?.error) {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
    } else {
      toast({ title: editing ? "Serviço atualizado" : "Serviço criado" });
      setOpen(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Excluir este serviço?")) return;
    await deleteService(id);
    toast({ title: "Serviço excluído" });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4" /> Novo serviço
        </Button>
      </div>

      <div className="grid gap-3">
        {services.map((s) => (
          <Card key={s.id} className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{s.name}</h3>
                  <Badge variant="outline">{s.category === "recurring" ? "Mensal" : s.category === "one_time" ? "Único" : "Add-on"}</Badge>
                  {!s.is_active && <Badge variant="destructive">Inativo</Badge>}
                </div>
                {s.description && <p className="text-xs text-muted-foreground mt-1">{s.description}</p>}
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(s.base_price)}</div>
                <div className="text-xs text-muted-foreground">{s.price_type === "monthly" ? "/mês" : ""}</div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" onClick={() => openEdit(s)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => handleDelete(s.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar serviço" : "Novo serviço"}</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input name="name" defaultValue={editing?.name} required />
              </div>
              {!editing && (
                <div className="space-y-1.5">
                  <Label>Slug *</Label>
                  <Input name="slug" required placeholder="gestao-trafego" />
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Textarea name="description" rows={2} defaultValue={editing?.description ?? ""} />
            </div>
            <div className="grid md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recurring">Mensal</SelectItem>
                    <SelectItem value="one_time">Único</SelectItem>
                    <SelectItem value="add_on">Add-on</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Tipo de preço</Label>
                <Select value={priceType} onValueChange={setPriceType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="one_time">Único</SelectItem>
                    <SelectItem value="per_unit">Por unidade</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Preço base</Label>
                <Input type="number" step="0.01" name="base_price" defaultValue={editing?.base_price ?? 0} required />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Cláusulas (JSON) — opcional</Label>
              <Textarea
                name="contract_clauses"
                rows={4}
                placeholder='[{"title":"...","body":"...","order":100}]'
                defaultValue={editing ? JSON.stringify(editing.contract_clauses ?? [], null, 2) : ""}
              />
            </div>
            {editing && (
              <div className="flex items-center gap-2">
                <input type="checkbox" name="is_active" defaultChecked={editing.is_active} className="h-4 w-4" />
                <Label>Ativo</Label>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{editing ? "Salvar" : "Criar"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
