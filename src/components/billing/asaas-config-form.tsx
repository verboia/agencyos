"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { saveBillingConfig } from "@/app/(dashboard)/settings/billing/actions";
import { useToast } from "@/components/ui/use-toast";
import type { BillingConfig } from "@/types/database";

export function AsaasConfigForm({ config }: { config: BillingConfig | null }) {
  const [environment, setEnvironment] = useState<string>(config?.asaas_environment ?? "sandbox");
  const [defaultMethod, setDefaultMethod] = useState<string>(config?.default_payment_method ?? "PIX");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    formData.set("asaas_environment", environment);
    formData.set("default_payment_method", defaultMethod);
    const result = await saveBillingConfig(formData);
    if (result?.error) toast({ title: "Erro", description: result.error, variant: "destructive" });
    else toast({ title: "Configurações salvas" });
    setLoading(false);
  }

  const hasKey = Boolean(config?.asaas_api_key);

  return (
    <form action={handleSubmit}>
      {!hasKey && (
        <Alert className="mb-4">
          <AlertDescription>
            Sem API key configurada, o sistema roda em modo <strong>mock</strong>: cobranças simuladas aparecem no
            financeiro, mas não são emitidas de verdade. Assim que adicionar sua chave Asaas, a cobrança passa a ser real.
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciais Asaas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="asaas_api_key">API Key</Label>
            <Input
              id="asaas_api_key"
              name="asaas_api_key"
              type="password"
              defaultValue={config?.asaas_api_key ?? ""}
              placeholder="$aact_..."
            />
          </div>
          <div className="space-y-1.5">
            <Label>Ambiente</Label>
            <Select value={environment} onValueChange={setEnvironment}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sandbox">Sandbox (testes)</SelectItem>
                <SelectItem value="production">Produção</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Dados da empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Razão social</Label>
            <Input name="company_legal_name" defaultValue={config?.company_legal_name ?? ""} />
          </div>
          <div className="space-y-1.5">
            <Label>CNPJ</Label>
            <Input name="company_document" defaultValue={config?.company_document ?? ""} />
          </div>
        </CardContent>
      </Card>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Configurações padrão</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Método padrão</Label>
              <Select value={defaultMethod} onValueChange={setDefaultMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="CREDIT_CARD">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Dia de vencimento padrão</Label>
              <Input type="number" min={1} max={28} name="default_due_day" defaultValue={config?.default_due_day ?? 10} />
            </div>
            <div className="space-y-1.5">
              <Label>Multa atraso (%)</Label>
              <Input type="number" step="0.01" name="default_fine_percentage" defaultValue={config?.default_fine_percentage ?? 2} />
            </div>
            <div className="space-y-1.5">
              <Label>Juros mensal (%)</Label>
              <Input type="number" step="0.01" name="default_interest_monthly" defaultValue={config?.default_interest_monthly ?? 1} />
            </div>
            <div className="space-y-1.5">
              <Label>Pausar serviço após (dias)</Label>
              <Input type="number" name="pause_service_after_days" defaultValue={config?.pause_service_after_days ?? 15} />
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-4 flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Salvando…" : "Salvar configurações"}
        </Button>
      </div>
    </form>
  );
}
