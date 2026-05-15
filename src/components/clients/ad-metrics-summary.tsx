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
  Wallet,
  AlertTriangle,
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
      .select(
        "id, platform, status, last_sync_at, external_account_id, external_account_name, metadata"
      )
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
              <MetaBalances integrations={integrations ?? []} />

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

interface MetaIntegrationMetadata {
  balance?: number | null;
  spend_cap?: number | null;
  amount_spent?: number | null;
  balance_synced_at?: string;
  currency?: string;
}

function MetaBalances({
  integrations,
}: {
  integrations: Array<{
    id: string;
    platform: string;
    external_account_id: string;
    external_account_name: string | null;
    metadata: MetaIntegrationMetadata | null;
  }>;
}) {
  const metaAccounts = integrations.filter((i) => i.platform === "meta");
  if (metaAccounts.length === 0) return null;

  const anyHasBalanceData = metaAccounts.some(
    (i) =>
      i.metadata &&
      (i.metadata.balance !== undefined ||
        i.metadata.spend_cap !== undefined ||
        i.metadata.amount_spent !== undefined)
  );

  if (!anyHasBalanceData) {
    return (
      <div className="rounded-lg border border-dashed border-slate-200 p-3 text-xs text-muted-foreground flex items-center gap-2">
        <Wallet className="h-3.5 w-3.5" />
        Saldo Meta Ads ainda não sincronizado — clique em &quot;Sincronizar&quot; na aba Integrações.
      </div>
    );
  }

  return (
    <div>
      <div className="text-xs text-muted-foreground mb-2">Saldo Meta Ads</div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {metaAccounts.map((acc) => {
          const md = acc.metadata ?? {};
          const debt = typeof md.balance === "number" ? md.balance : null;
          const spendCap = typeof md.spend_cap === "number" ? md.spend_cap : null;
          const amountSpent = typeof md.amount_spent === "number" ? md.amount_spent : null;
          const hasCap = spendCap !== null && spendCap > 0;
          const available =
            hasCap && amountSpent !== null ? Math.max(spendCap - amountSpent, 0) : null;
          const hasDebt = debt !== null && debt > 0;
          const lowBalance = available !== null && available < 100;

          return (
            <div
              key={acc.id}
              className={`rounded-lg border p-3 space-y-2 ${
                lowBalance ? "border-red-200 bg-red-50/50" : "border-slate-200"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs font-medium truncate">
                  {acc.external_account_name ?? `Conta #${acc.external_account_id}`}
                </div>
                {lowBalance && <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />}
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div>
                  <div className="text-muted-foreground flex items-center gap-1">
                    <Wallet className="h-3 w-3" /> Saldo disponível
                  </div>
                  <div
                    className={`font-semibold mt-0.5 ${lowBalance ? "text-red-600" : "text-foreground"}`}
                  >
                    {available !== null ? formatCurrency(available) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Gasto</div>
                  <div className="font-semibold mt-0.5">
                    {amountSpent !== null ? formatCurrency(amountSpent) : "—"}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total recarregado</div>
                  <div className="font-semibold mt-0.5">
                    {hasCap ? formatCurrency(spendCap) : "Sem limite"}
                  </div>
                </div>
              </div>
              {hasDebt && (
                <div className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded px-1.5 py-0.5">
                  Dívida em aberto: {formatCurrency(debt)}
                </div>
              )}
            </div>
          );
        })}
      </div>
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
