"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { createAdditionalInvoice } from "@/app/(dashboard)/billing/actions";
import { useToast } from "@/components/ui/use-toast";

export function CreateInvoiceDialogTrigger({ clients }: { clients: Array<{ id: string; company_name: string }> }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [clientId, setClientId] = useState("");
  const { toast } = useToast();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    formData.set("client_id", clientId);
    const result = await createAdditionalInvoice(formData);
    if (result?.error) toast({ title: "Erro", description: result.error, variant: "destructive" });
    else {
      toast({ title: "Cobrança criada" });
      setOpen(false);
    }
    setLoading(false);
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Cobrança avulsa
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova cobrança avulsa</DialogTitle>
          </DialogHeader>
          <form action={handleSubmit} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Valor</Label>
              <Input name="value" type="number" step="0.01" required />
            </div>
            <div className="space-y-1.5">
              <Label>Vencimento</Label>
              <Input name="due_date" type="date" required />
            </div>
            <div className="space-y-1.5">
              <Label>Descrição</Label>
              <Input name="description" required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading || !clientId}>
                {loading ? "Criando…" : "Criar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
