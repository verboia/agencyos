"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { createReport } from "@/app/(dashboard)/reports/actions";

export function ReportForm({ clientId }: { clientId: string }) {
  const [reportType, setReportType] = useState("monthly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    formData.set("report_type", reportType);
    const result = await createReport(clientId, formData);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Período</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Mensal</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Início</Label>
              <Input type="date" name="period_start" required />
            </div>
            <div className="space-y-1.5">
              <Label>Fim</Label>
              <Input type="date" name="period_end" required />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métricas de Ads</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3">
          <NumericField name="ad_spend" label="Investido (R$)" step="0.01" />
          <NumericField name="impressions" label="Impressões" />
          <NumericField name="clicks" label="Cliques" />
          <NumericField name="ctr" label="CTR (0 a 1)" step="0.0001" />
          <NumericField name="cpc" label="CPC (R$)" step="0.01" />
          <NumericField name="leads" label="Leads" />
          <NumericField name="cpl" label="CPL (R$)" step="0.01" />
          <NumericField name="conversions" label="Conversões" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Métricas CRM / SDR</CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-3 gap-3">
          <NumericField name="leads_contacted" label="Leads contatados" />
          <NumericField name="leads_qualified" label="Qualificados" />
          <NumericField name="appointments_booked" label="Agendamentos" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Análise</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Destaques do período</Label>
            <Textarea name="highlights" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Pontos de melhoria</Label>
            <Textarea name="improvements" rows={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Próximas ações</Label>
            <Textarea name="next_actions" rows={3} />
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>
          {loading ? "Criando…" : "Criar rascunho"}
        </Button>
      </div>
    </form>
  );
}

function NumericField({ name, label, step }: { name: string; label: string; step?: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input name={name} type="number" step={step ?? "1"} />
    </div>
  );
}
