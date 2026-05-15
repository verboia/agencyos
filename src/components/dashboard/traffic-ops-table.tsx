import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatNumber, formatRelativeTime } from "@/lib/utils/format";
import { SyncAllButton } from "@/components/dashboard/sync-all-button";

interface IntegrationMetadata {
  balance?: number | null;
  spend_cap?: number | null;
  amount_spent?: number | null;
  balance_synced_at?: string;
}

interface IntegrationRow {
  id: string;
  client_id: string;
  external_account_id: string;
  external_account_name: string | null;
  last_sync_at: string | null;
  metadata: IntegrationMetadata | null;
  clients: { id: string; company_name: string } | { id: string; company_name: string }[] | null;
}

interface DailyMetricRow {
  client_id: string;
  spend: number | null;
  messaging_conversations: number | null;
  leads: number | null;
}

interface ManualMetricRow {
  client_id: string;
  qualified_leads: number | null;
}

const LOW_THRESHOLD = 100;
const MID_THRESHOLD = 300;
const STALE_SYNC_HOURS = 24;
const WARN_SYNC_HOURS = 6;

type Severity = "ok" | "warn" | "alert";

export async function TrafficOpsTable() {
  const supabase = await createServerClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since = new Date(today);
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().slice(0, 10);

  const [{ data: integrationsRaw }, { data: metricsRaw }, { data: manualRaw }] =
    await Promise.all([
      supabase
        .from("ad_integrations")
        .select(
          "id, client_id, external_account_id, external_account_name, last_sync_at, metadata, clients(id, company_name)"
        )
        .eq("platform", "meta")
        .eq("status", "connected"),
      supabase
        .from("ad_metrics_daily")
        .select("client_id, spend, messaging_conversations, leads")
        .eq("platform", "meta")
        .gte("date", sinceStr),
      supabase
        .from("client_manual_metrics")
        .select("client_id, qualified_leads")
        .gte("date", sinceStr),
    ]);

  const integrations = (integrationsRaw ?? []) as IntegrationRow[];
  const metrics = (metricsRaw ?? []) as DailyMetricRow[];
  const manual = (manualRaw ?? []) as ManualMetricRow[];

  // Agrega métricas por cliente
  const metricsByClient = new Map<string, { spend: number; conversas: number; leadsAuto: number }>();
  for (const m of metrics) {
    const acc = metricsByClient.get(m.client_id) ?? { spend: 0, conversas: 0, leadsAuto: 0 };
    acc.spend += Number(m.spend ?? 0);
    acc.conversas += Number(m.messaging_conversations ?? 0);
    acc.leadsAuto += Number(m.leads ?? 0);
    metricsByClient.set(m.client_id, acc);
  }
  const qualifByClient = new Map<string, number>();
  for (const m of manual) {
    qualifByClient.set(
      m.client_id,
      (qualifByClient.get(m.client_id) ?? 0) + Number(m.qualified_leads ?? 0)
    );
  }

  const rows = integrations.map((i) => {
    const md = i.metadata ?? {};
    const spendCap = typeof md.spend_cap === "number" ? md.spend_cap : null;
    const amountSpent = typeof md.amount_spent === "number" ? md.amount_spent : null;
    const hasCap = spendCap !== null && spendCap > 0;
    const available =
      hasCap && amountSpent !== null ? Math.max(spendCap - amountSpent, 0) : null;
    const client = Array.isArray(i.clients) ? i.clients[0] : i.clients;

    const m = metricsByClient.get(i.client_id) ?? { spend: 0, conversas: 0, leadsAuto: 0 };
    const qualifiedLeads = qualifByClient.get(i.client_id) ?? 0;
    const effectiveLeads = qualifiedLeads > 0 ? qualifiedLeads : m.leadsAuto;
    const cpl = effectiveLeads > 0 ? m.spend / effectiveLeads : null;

    const syncHoursAgo = i.last_sync_at
      ? (Date.now() - new Date(i.last_sync_at).getTime()) / 3_600_000
      : null;

    let severity: Severity = "ok";
    if (
      (available !== null && available < LOW_THRESHOLD) ||
      (syncHoursAgo !== null && syncHoursAgo > STALE_SYNC_HOURS) ||
      (syncHoursAgo === null) ||
      m.spend === 0
    ) {
      severity = "alert";
    } else if (
      (available !== null && available < MID_THRESHOLD) ||
      (syncHoursAgo !== null && syncHoursAgo > WARN_SYNC_HOURS)
    ) {
      severity = "warn";
    }

    return {
      integrationId: i.id,
      clientId: client?.id ?? i.client_id,
      clientName: client?.company_name ?? "—",
      accountName: i.external_account_name ?? `Conta #${i.external_account_id}`,
      available,
      spend7d: m.spend,
      conversas7d: m.conversas,
      leadsQualif7d: qualifiedLeads,
      leadsAuto7d: m.leadsAuto,
      cpl,
      lastSyncAt: i.last_sync_at,
      severity,
    };
  });

  // Ordenação: alert primeiro, warn, ok. Dentro de cada bucket, menor saldo primeiro.
  const severityRank: Record<Severity, number> = { alert: 0, warn: 1, ok: 2 };
  rows.sort((a, b) => {
    const sevDiff = severityRank[a.severity] - severityRank[b.severity];
    if (sevDiff !== 0) return sevDiff;
    const aBal = a.available ?? Number.POSITIVE_INFINITY;
    const bBal = b.available ?? Number.POSITIVE_INFINITY;
    return aBal - bBal;
  });

  const lastGlobalSync = rows.reduce<string | null>((latest, r) => {
    if (!r.lastSyncAt) return latest;
    if (!latest) return r.lastSyncAt;
    return new Date(r.lastSyncAt) > new Date(latest) ? r.lastSyncAt : latest;
  }, null);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Tráfego dos clientes</CardTitle>
          <CardDescription className="mt-1">
            {rows.length === 0
              ? "Nenhuma conta Meta Ads conectada ainda."
              : `${rows.length} conta${rows.length === 1 ? "" : "s"} · ${lastGlobalSync ? `última sync ${formatRelativeTime(lastGlobalSync)}` : "ainda não sincronizado"}`}
          </CardDescription>
        </div>
        <SyncAllButton />
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Vincule contas Meta Ads aos clientes para ver a operação aqui.
          </p>
        ) : (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-2 w-6"></th>
                  <th className="py-2 pr-3 font-medium text-xs text-muted-foreground">Cliente</th>
                  <th className="py-2 pr-3 font-medium text-xs text-muted-foreground text-right">Saldo</th>
                  <th className="py-2 pr-3 font-medium text-xs text-muted-foreground text-right">Invest 7d</th>
                  <th className="py-2 pr-3 font-medium text-xs text-muted-foreground text-right">Conv 7d</th>
                  <th className="py-2 pr-3 font-medium text-xs text-muted-foreground text-right">Leads 7d</th>
                  <th className="py-2 pr-3 font-medium text-xs text-muted-foreground text-right">CPL</th>
                  <th className="py-2 pr-0 font-medium text-xs text-muted-foreground text-right">Sync</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.integrationId}
                    className="border-b border-border last:border-b-0 hover:bg-accent/30"
                  >
                    <td className="py-2.5 pr-2">
                      <SeverityDot severity={r.severity} />
                    </td>
                    <td className="py-2.5 pr-3">
                      <Link
                        href={`/clients/${r.clientId}?tab=integrations`}
                        className="block hover:underline"
                      >
                        <div className="font-medium leading-tight">{r.clientName}</div>
                        <div className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                          {r.accountName}
                        </div>
                      </Link>
                    </td>
                    <td
                      className={`py-2.5 pr-3 text-right tabular-nums font-medium ${
                        r.available !== null && r.available < LOW_THRESHOLD
                          ? "text-red-600"
                          : r.available !== null && r.available < MID_THRESHOLD
                          ? "text-amber-600"
                          : "text-foreground"
                      }`}
                    >
                      {r.available !== null ? formatCurrency(r.available) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {r.spend7d > 0 ? formatCurrency(r.spend7d) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {r.conversas7d > 0 ? formatNumber(r.conversas7d) : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {r.leadsQualif7d > 0
                        ? formatNumber(r.leadsQualif7d)
                        : r.leadsAuto7d > 0
                        ? `${formatNumber(r.leadsAuto7d)}*`
                        : "—"}
                    </td>
                    <td className="py-2.5 pr-3 text-right tabular-nums">
                      {r.cpl !== null ? formatCurrency(r.cpl) : "—"}
                    </td>
                    <td className="py-2.5 pr-0 text-right text-xs text-muted-foreground">
                      {r.lastSyncAt ? formatRelativeTime(r.lastSyncAt) : "nunca"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-[11px] text-muted-foreground mt-3 flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1.5">
                <SeverityDot severity="alert" /> saldo &lt; R$ 100 ou sync velha
              </span>
              <span className="flex items-center gap-1.5">
                <SeverityDot severity="warn" /> saldo &lt; R$ 300
              </span>
              <span className="flex items-center gap-1.5">
                <SeverityDot severity="ok" /> ok
              </span>
              <span>* lead automático (sem registro manual)</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SeverityDot({ severity }: { severity: Severity }) {
  const color =
    severity === "alert" ? "bg-red-500" : severity === "warn" ? "bg-amber-500" : "bg-green-500";
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${color}`} />;
}
