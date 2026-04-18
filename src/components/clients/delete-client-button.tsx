"use client";

import { useState } from "react";
import { Trash2, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { deleteClient } from "@/app/(dashboard)/clients/actions";

interface Props {
  clientId: string;
  clientName: string;
}

export function DeleteClientButton({ clientId, clientName }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = confirmation.trim().toLowerCase() === clientName.trim().toLowerCase();

  async function handleDelete() {
    if (!canDelete) return;
    setLoading(true);
    try {
      const result = await deleteClient(clientId);
      if (result && "error" in result && result.error) {
        toast({ title: "Erro ao excluir", description: result.error, variant: "destructive" });
        setLoading(false);
        return;
      }
    } catch {
      // redirect("/clients") lança NEXT_REDIRECT — comportamento esperado.
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setConfirmation("");
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir cliente permanentemente?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta ação apaga o cliente <strong>{clientName}</strong> e todos os dados relacionados
            (tarefas, briefing, contratos, relatórios, assets, cobranças). Não é possível desfazer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
          <Label>
            Para confirmar, digite o nome do cliente: <span className="font-mono">{clientName}</span>
          </Label>
          <Input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            placeholder={clientName}
            autoFocus
          />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={!canDelete || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Excluir definitivamente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
