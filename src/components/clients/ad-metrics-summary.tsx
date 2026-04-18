import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Target,
  TrendingUp,
  MousePointerClick,
  MessageCircle,
  UserCheck,
  DollarSign,
  ShoppingCart,
  Banknote,
} from "lucide-react";
import { formatCurrency, formatNumber, formatDate, formatRelativeTime } from "@/lib/utils/format";
import { ManualMetricsEditor } from "@/components/clients/manual-metrics-editor";

interface Props {
  clientId: string;
  daysBack?: number;
}

export async function AdMetricsSummary({ clientId, daysBack = 30 }: Props) {
  const supabase = await createServerClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since = new Date(today);
  since.setDate(since.getDate() - daysBack);
  const sinceStr = since.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [{ data: metrics }, { data: manualMetrics }, { data: integrations }] = await Promise.all([
    supabase
      .from("ad_metrics_daily")
      .select("*")
      .eq("client_id", clientId)
      .gte("date", sinceStr)
      .order("date", { ascending: true }),
    supabase
      .from("client_manual_metrics")
      .select("*")
      .eq("client_id", clientId)
      .gte("date", sinceStr)
      .order("date", { ascending: false }),
    supabase
      .from("ad_integrations")
      .select("platform, status, last_sync_at, external_account_name")
      .eq("client_id", clientId)
      .eq("status", "connected"),
  ]);

  const hasIntegrations = (integrations?.length ?? 0) > 0;
  const lastSync = integrations?.[0]?.last_sync_at;

  // Totais auto
  const totals = (metrics ?? []).reduce(
    (acc, m) => ({
      spend: acc.spend + Number(m.spend ?? 0),
      impressions: acc.impressions + Number(m.impressions ?? 0),
      clicks: acc.clicks + Number(m.clicks ?? 0),
      messaging: acc.messaging + Number(m.messaging_conversations ?? 0),
      leads: acc.leads + Number(m.leads ?? 0),
    }),
    { spend: 0, impressions: 0, clicks: 0, messaging: 0, leads: 0 }
  );

  // Totais manuais
  const manualTotals = (manualMetrics ?? []).reduce(
    (acc, m) => ({
      qualified_leads: acc.qualified_leads + Number(m.qualified_leads ?? 0),
      sales_count: acc.sales_count + Number(m.sales_count ?? 0),
      revenue: acc.revenue + Number(m.revenue ?? 0),
    }),
    { qualified_leads: 0, sales_count: 0, revenue: 0 }
  );

  const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const costPerConversation = totals.messaging > 0 ? totals.spend / totals.messaging : 0;
  const cplQualified =
    manualTotals.qualified_leads > 0 ? totals.spend / manualTotals.qualified_leads : 0;
  const cac = manualTotals.sales_count > 0 ? totals.spend / manualTotals.sales_count : 0;
  const roas = totals.spend > 0 ? manualTotals.revenue / totals.spend : 0;

  // Monta linhas do editor manual — últimos 14 dias sempre (independe do daysBack)
  const editorRows = buildEditorRows(metrics ?? [], manualMetrics ?? [], 14, todayStr);

  const firstDate = metrics?.[0]?.date;
  const lastDate = metrics?.[metrics.length - 1]?.date;
  const accountsUsed = new Set((metrics ?? []).map((m) => m.external_account_id)).size;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-[#1877f2]" /> Últimos {daysBack} dias
              </CardTitle>
              <CardDescription>
                {hasIntegrations && metrics && metrics.length > 0
                  ? `${formatDate(firstDate)} → ${formatDate(lastDate)} · ${accountsUsed} conta${accountsUsed === 1 ? "" : "s"} Meta`
                  : hasIntegrations
                  ? "Contas conectadas, sem dados sincronizados no período."
                  : "Nenhuma conta de anúncios conectada."}
              </CardDescription>
            </div>
            {lastSync && (
              <span className="text-xs text-muted-foreground">
                Sincronizado {formatRelativeTime(lastSync)}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasIntegrations ? (
            <Alert>
              <AlertDescription className="text-sm">
                Vá para a aba{" "}
                <Link href={`/clients/${clientId}?tab=integrations`} className="underline font-medium">
                  Integrações
                </Link>{" "}
                e envie o link de conexão para o cliente.
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <div>
                <div className="text-xs text-muted-foreground mb-2">Dados automáticos da Meta</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Metric
                    icon={<DollarSign className="h-4 w-4" />}
                    label="Investido"
                    value={formatCurrency(totals.spend)}
                  />
                  <Metric
                    icon={<MessageCircle className="h-4 w-4" />}
                    label="Conversas iniciadas"
                    value={formatNumber(totals.messaging)}
                    sub={
                      totals.messaging > 0
                        ? `${formatCurrency(costPerConversation)} por conversa`
                        : undefined
                    }
                  />
                  <Metric
                    icon={<MousePointerClick className="h-4 w-4" />}
                    label="Cliques"
                    value={formatNumber(totals.clicks)}
                    sub={totals.clicks > 0 ? `CPC ${formatCurrency(cpc)}` : undefined}
                  />
                  <Metric
                    icon={<TrendingUp className="h-4 w-4" />}
                    label="Impressões"
                    value={formatNumber(totals.impressions)}
                    sub={
                      totals.impressions > 0 ? `CTR ${(ctr * 100).toFixed(2)}%` : undefined
                    }
                  />
                </div>
              </div>

              <div>
                <div className="text-xs text-muted-foreground mb-2">Resultado real (registro manual)</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Metric
                    icon={<UserCheck className="h-4 w-4" />}
                    label="Leads qualificados"
                    value={formatNumber(manualTotals.qualified_leads)}
                    sub={
                      manualTotals.qualified_leads > 0
                        ? `CPL qualif. ${formatCurrency(cplQualified)}`
                        : undefined
                    }
                  />
                  <Metric
                    icon={<ShoppingCart className="h-4 w-4" />}
                    label="Vendas"
                    value={formatNumber(manualTotals.sales_count)}
                    sub={
                      manualTotals.sales_count > 0 ? `CAC ${formatCurrency(cac)}` : undefined
                    }
                  />
                  <Metric
                    icon={<Banknote className="h-4 w-4" />}
                    label="Receita"
                    value={formatCurrency(manualTotals.revenue)}
                    sub={
                      totals.spend > 0 && manualTotals.revenue > 0
                        ? `ROAS ${roas.toFixed(2)}x`
                        : undefined
                    }
                  />
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {hasIntegrations && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Registro diário · últimos 14 dias</CardTitle>
            <CardDescription>
              Preencha leads qualificados, vendas e receita por dia. O investimento vem automático
              da Meta.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ManualMetricsEditor clientId={clientId} rows={editorRows} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 space-y-1">
      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
        {icon}
        {label}
      </div>
      <div className="text-lg font-semibold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function buildEditorRows(
  metrics: Array<{ date: string; spend: number | null; external_account_id: string }>,
  manual: Array<{
    date: string;
    qualified_leads: number;
    sales_count: number;
    revenue: number;
  }>,
  days: number,
  todayStr: string
) {
  // Agrega spend por dia (pode haver várias contas)
  const spendByDay = new Map<string, number>();
  for (const m of metrics) {
    spendByDay.set(m.date, (spendByDay.get(m.date) ?? 0) + Number(m.spend ?? 0));
  }
  const manualByDay = new Map(manual.map((m) => [m.date, m]));

  const rows: Array<{
    date: string;
    qualified_leads: number;
    sales_count: number;
    revenue: number;
    spend?: number;
    isToday?: boolean;
  }> = [];

  const base = new Date(todayStr);
  for (let i = 0; i < days; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const manualRow = manualByDay.get(key);
    rows.push({
      date: key,
      qualified_leads: manualRow?.qualified_leads ?? 0,
      sales_count: manualRow?.sales_count ?? 0,
      revenue: Number(manualRow?.revenue ?? 0),
      spend: spendByDay.get(key),
      isToday: key === todayStr,
    });
  }

  return rows;
}
