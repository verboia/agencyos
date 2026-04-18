"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { SEGMENTS } from "@/lib/utils/constants";
import { maskPhone } from "@/lib/utils/validators";
import { createClient, updateClient } from "@/app/(dashboard)/clients/actions";
import type { Profile, Client } from "@/types/database";

interface Props {
  profiles: Profile[];
  client?: Client;
}

export function ClientForm({ profiles, client }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phone, setPhone] = useState(client?.contact_phone ?? "");
  const [segment, setSegment] = useState(client?.segment ?? "");
  const [assignedTo, setAssignedTo] = useState(client?.assigned_to ?? "");
  const submittingRef = useRef(false);

  async function handleSubmit(formData: FormData) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(null);
    formData.set("segment", segment);
    formData.set("assigned_to", assignedTo);
    const action = client ? updateClient.bind(null, client.id) : createClient;
    try {
      const result = await action(formData);
      if (result && "error" in result && result.error) {
        setError(result.error);
        setLoading(false);
        submittingRef.current = false;
      }
    } catch (err) {
      // redirect() do Next.js levanta um erro controlado — repropaga
      throw err;
    }
  }

  return (
    <form action={handleSubmit} className={loading ? "pointer-events-none opacity-60" : ""}>
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">Nome da empresa *</Label>
              <Input id="company_name" name="company_name" defaultValue={client?.company_name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="segment">Segmento</Label>
              <Select value={segment} onValueChange={setSegment}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SEGMENTS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_name">Nome do contato *</Label>
              <Input id="contact_name" name="contact_name" defaultValue={client?.contact_name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_phone">WhatsApp *</Label>
              <Input
                id="contact_phone"
                name="contact_phone"
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(67) 99141-8064"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">E-mail</Label>
              <Input
                id="contact_email"
                name="contact_email"
                type="email"
                defaultValue={client?.contact_email ?? ""}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthly_fee">Valor mensal</Label>
              <Input
                id="monthly_fee"
                name="monthly_fee"
                type="number"
                step="0.01"
                defaultValue={client?.monthly_fee ?? 1500}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract_months">Duração (meses)</Label>
              <Input
                id="contract_months"
                name="contract_months"
                type="number"
                defaultValue={client?.contract_months ?? 12}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contract_start">Início</Label>
              <Input
                id="contract_start"
                name="contract_start"
                type="date"
                defaultValue={client?.contract_start ?? new Date().toISOString().slice(0, 10)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Responsável</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um responsável" />
              </SelectTrigger>
              <SelectContent>
                {profiles.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.full_name} ({p.role === "admin" ? "Admin" : "Operador"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="submit" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : client ? "Salvar alterações" : "Cadastrar cliente"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
