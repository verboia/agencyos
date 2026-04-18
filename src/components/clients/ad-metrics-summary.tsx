import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, TrendingUp, MousePointerClick, Users, DollarSign } from "lucide-react";
import { formatCurrency, formatNumber, formatDate, formatRelativeTime } from "@/lib/utils/format";

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

  const [{ data: metrics }, { data: integrations }] = await Promise.all([
    supabase
      .from("ad_metrics_daily")
      .select("*")
      .eq("client_id", clientId)
      .gte("date", sinceStr)
      .order("date", { ascending: true }),
    supabase
      .from("ad_integrations")
      .select("platform, status, last_sync_at, external_account_name")
      .eq("client_id", clientId)
      .eq("status", "connected"),
  ]);

  const hasIntegrations = (integrations?.length ?? 0) > 0;

  if (!hasIntegrations) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" /> Métricas automáticas
          </CardTitle>
          <CardDescription>
            Dados em tempo real das plataformas de anúncios conectadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="text-sm">
              Nenhuma conta de anúncios conectada. Vá para a aba{" "}
              <Link href={`/clients/${clientId}?tab=integrations`} className="underline font-medium">
                Integrações
              </Link>{" "}
              e envie o link de conexão para o cliente.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.length === 0) {
    const lastSync = integrations?.[0]?.last_sync_at;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4 text-[#1877f2]" /> Últimos {daysBack} dias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription className="text-sm">
              Contas conectadas, mas ainda sem métricas sincronizadas.{" "}
              {lastSync
                ? `Última tentativa ${formatRelativeTime(lastSync)} (pode não ter dados no período).`
                : "Clique em \"Sincronizar agora\" na aba Integrações."}
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  const totals = metrics.reduce(
    (acc, m) => ({
      spend: acc.spend + Number(m.spend ?? 0),
      impressions: acc.impressions + Number(m.impressions ?? 0),
      clicks: acc.clicks + Number(m.clicks ?? 0),
      leads: acc.leads + Number(m.leads ?? 0),
    }),
    { spend: 0, impressions: 0, clicks: 0, leads: 0 }
  );

  const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0;

  const firstDate = metrics[0]?.date;
  const lastDate = metrics[metrics.length - 1]?.date;
  const accountsUsed = new Set(metrics.map((m) => m.external_account_id)).size;
  const lastSync = integrations?.[0]?.last_sync_at;

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-[#1877f2]" /> Últimos {daysBack} dias
            </CardTitle>
            <CardDescription>
              {formatDate(firstDate)} → {formatDate(lastDate)} · {accountsUsed} conta
              {accountsUsed === 1 ? "" : "s"} Meta
            </CardDescription>
          </div>
          {lastSync && (
            <span className="text-xs text-muted-foreground">
              Sincronizado {formatRelativeTime(lastSync)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Metric
            icon={<DollarSign className="h-4 w-4" />}
            label="Investido"
            value={formatCurrency(totals.spend)}
          />
          <Metric
            icon={<Users className="h-4 w-4" />}
            label="Leads"
            value={formatNumber(totals.leads)}
            sub={totals.leads > 0 ? `CPL ${formatCurrency(cpl)}` : undefined}
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
            sub={totals.impressions > 0 ? `CTR ${(ctr * 100).toFixed(2)}%` : undefined}
          />
        </div>
      </CardContent>
    </Card>
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
