"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createTeamMember, removeMember, updateMemberRole } from "@/app/(dashboard)/settings/team/actions";
import { useToast } from "@/components/ui/use-toast";
import { getInitials } from "@/lib/utils/format";
import { Plus, Trash2 } from "lucide-react";
import type { Profile } from "@/types/database";

interface Props {
  profiles: Profile[];
  currentUserId: string;
  canManage: boolean;
}

export function TeamManager({ profiles, currentUserId, canManage }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<"admin" | "operator">("operator");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  async function handleCreate(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("role", role);
    const result = await createTeamMember(formData);
    if (result?.error) {
      setError(result.error);
    } else {
      toast({ title: "Membro criado" });
      setOpen(false);
    }
    setLoading(false);
  }

  async function handleRoleChange(id: string, newRole: "admin" | "operator") {
    const result = await updateMemberRole(id, newRole);
    if (result?.error) toast({ title: "Erro", description: result.error, variant: "destructive" });
    else toast({ title: "Role atualizada" });
  }

  async function handleRemove(id: string, name: string) {
    if (!confirm(`Remover ${name} da equipe?`)) return;
    const result = await removeMember(id);
    if (result?.error) toast({ title: "Erro", description: result.error, variant: "destructive" });
    else toast({ title: "Membro removido" });
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="flex justify-end">
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Adicionar membro
          </Button>
        </div>
      )}

      {!canManage && (
        <Alert>
          <AlertDescription>
            Apenas administradores podem gerenciar a equipe.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Membros ({profiles.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {profiles.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between gap-3 p-3 rounded-md border border-border"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-primary/15 text-primary">
                    {getInitials(p.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {p.full_name}
                    {p.id === currentUserId && (
                      <span className="text-xs text-muted-foreground ml-2">(você)</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">{p.email}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {canManage && p.id !== currentUserId ? (
                  <Select
                    value={p.role}
                    onValueChange={(v) => handleRoleChange(p.id, v as "admin" | "operator")}
                  >
                    <SelectTrigger className="h-8 w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="operator">Operador</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={p.role === "admin" ? "default" : "secondary"}>
                    {p.role === "admin" ? "Admin" : "Operador"}
                  </Badge>
                )}
                {canManage && p.id !== currentUserId && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(p.id, p.full_name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar membro</DialogTitle>
          </DialogHeader>
          <form action={handleCreate} className="space-y-3">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input name="full_name" required />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input name="email" type="email" required />
            </div>
            <div className="space-y-1.5">
              <Label>Senha inicial</Label>
              <Input name="password" type="password" minLength={6} required />
              <p className="text-xs text-muted-foreground">
                Mínimo 6 caracteres. Compartilhe com a pessoa — ela pode trocar depois.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>Permissão</Label>
              <Select value={role} onValueChange={(v) => setRole(v as "admin" | "operator")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="operator">Operador (execução)</SelectItem>
                  <SelectItem value="admin">Admin (acesso total)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Criando…" : "Criar membro"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
