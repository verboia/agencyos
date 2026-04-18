import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPercent, formatNumber } from "@/lib/utils/format";

export default async function PerformancePage() {
  const supabase = await createServerClient();
  const today = new Date();
  const month = today.getMonth() + 1;
  const year = today.getFullYear();

  const [{ data: profiles }, { data: monthly }, { data: daily }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role"),
    supabase
      .from("team_metrics_monthly")
      .select("*")
      .eq("metric_year", year)
      .eq("metric_month", month),
    supabase
      .from("team_metrics_daily")
      .select("*")
      .gte("metric_date", new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Performance do time</h1>
        <p className="text-sm text-muted-foreground">Métricas de execução e SLA — {month}/{year}.</p>
      </div>

      <div className="grid gap-4">
        {profiles?.map((p) => {
          const m = monthly?.find((x) => x.profile_id === p.id);
          const d = daily?.filter((x) => x.profile_id === p.id) ?? [];
          const totalCompleted = d.reduce((s, x) => s + x.tasks_completed, 0);

          return (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  {p.full_name}
                  <Badge variant="outline" className="text-xs">
                    {p.role === "admin" ? "Admin" : "Operador"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Taxa no prazo</div>
                  <div className="text-xl font-semibold">
                    {m?.on_time_rate != null ? formatPercent(Number(m.on_time_rate)) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Tarefas no mês</div>
                  <div className="text-xl font-semibold">{m?.total_tasks_completed ?? 0}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Últimos 30d</div>
                  <div className="text-xl font-semibold">{formatNumber(totalCompleted)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">SLA</div>
                  <div className="text-xl">
                    {m?.sla_met ? (
                      <Badge variant="success">Atingido</Badge>
                    ) : (
                      <Badge variant="warning">Abaixo</Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
