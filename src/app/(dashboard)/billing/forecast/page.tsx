export const dynamic = "force-dynamic";

import Link from "next/link";
import { getForecast } from "@/lib/services/forecast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { RevenueChart } from "@/components/billing/revenue-chart";

export default async function ForecastPage() {
  const forecast = await getForecast();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/billing">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Forecast de receita</h1>
          <p className="text-sm text-muted-foreground">Projeção para os próximos 3 meses.</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>MRR atual</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{formatCurrency(forecast.mrr)}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Clientes ativos</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{forecast.activeClients}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pipeline potencial</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{formatCurrency(forecast.pipelineValue)}</CardTitle>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Receita mensal</CardTitle>
        </CardHeader>
        <CardContent>
          <RevenueChart history={forecast.monthlyHistory} projection={forecast.projection} />
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" /> Riscos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {forecast.expiringContracts.length === 0 && forecast.churnRisk.length === 0 && forecast.overdue === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum risco identificado.</p>
            ) : (
              <>
                {forecast.overdue > 0 && (
                  <div className="p-3 rounded-md border border-destructive/30 bg-destructive/10">
                    <div className="text-sm font-medium">Inadimplência</div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(forecast.overdue)} em faturas vencidas
                    </div>
                  </div>
                )}
                {forecast.expiringContracts.map((c) => (
                  <div key={c.id} className="p-3 rounded-md border border-amber-500/30 bg-amber-500/10">
                    <div className="text-sm font-medium">{c.company_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Contrato expira em breve · {formatCurrency(c.monthly_value)}/mês
                    </div>
                  </div>
                ))}
                {forecast.churnRisk.map((c) => (
                  <div key={c.id} className="p-3 rounded-md border border-destructive/30 bg-destructive/10">
                    <div className="text-sm font-medium">{c.company_name}</div>
                    <div className="text-xs text-muted-foreground">
                      Health score crítico ({c.score}) · {formatCurrency(c.monthly_value)}/mês
                    </div>
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {forecast.pipelineCount} proposta(s) em aberto
            </div>
            <div className="text-2xl font-semibold mt-2">{formatCurrency(forecast.pipelineValue)}</div>
            <div className="text-xs text-muted-foreground">Valor mensal se todas forem aceitas</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Projeção (próximos 3 meses)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {forecast.projection.map((p) => (
              <div key={p.month} className="p-3 rounded-md border border-border flex items-center justify-between">
                <div className="text-sm font-medium">{p.month}</div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(p.total)}</div>
                  <div className="text-xs text-muted-foreground">
                    Base {formatCurrency(p.base)} + Pipeline {formatCurrency(p.pipeline)} - Risco {formatCurrency(p.risk)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
