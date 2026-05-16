import { createAdminClient } from "@/lib/supabase/admin";
import { syncMetaAdsMetrics, type SyncResult } from "@/lib/services/ad-metrics-sync";
import {
  sendToClientGroups,
  getRecentlySentGroupIds,
  type SendCategory,
} from "@/lib/services/whatsapp";
import {
  buildClientReportText,
  buildBalanceAlertText,
} from "@/lib/services/whatsapp-templates";

interface CronStep {
  step: string;
  total: number;
  sent: number;
  skipped: number;
  failed: number;
}

export interface MorningCronResult {
  sync: SyncResult;
  steps: CronStep[];
  ran_at: string;
  date: string; // YYYY-MM-DD
}

export interface EveningCronResult {
  steps: CronStep[];
  ran_at: string;
  date: string;
}

/**
 * Retorna início do dia, da semana (segunda 00:00) e do mês (dia 1 00:00) na
 * timezone do servidor (que na Vercel é UTC). Brasília = UTC-3, então segunda
 * 00:00 BR = domingo 03:00 UTC. Aqui usamos UTC mesmo porque o cron roda em UTC
 * e estamos só comparando "já enviou nesse balde de tempo?".
 */
function bucketStarts(now: Date): { dayStart: Date; weekStart: Date; monthStart: Date } {
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);

  const weekStart = new Date(dayStart);
  // getUTCDay: 0=dom, 1=seg... voltamos pra última segunda
  const dow = weekStart.getUTCDay();
  const offsetToMonday = dow === 0 ? -6 : 1 - dow;
  weekStart.setUTCDate(weekStart.getUTCDate() + offsetToMonday);

  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  return { dayStart, weekStart, monthStart };
}

async function listOrgs(): Promise<string[]> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("organizations").select("id");
  return (data ?? []).map((o) => o.id as string);
}

async function listActiveClients(orgId: string): Promise<Array<{ id: string }>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("clients")
    .select("id")
    .eq("organization_id", orgId)
    .in("status", ["active", "onboarding"]);
  return (data ?? []).map((c) => ({ id: c.id as string }));
}

interface RunCategoryParams {
  category: SendCategory;
  orgId: string;
  clients: Array<{ id: string }>;
  since: Date;
  buildText: (clientId: string) => Promise<{ text: string; skip?: boolean } | null>;
  stepLabel: string;
}

async function runCategory(params: RunCategoryParams): Promise<CronStep> {
  const skipSet = await getRecentlySentGroupIds(params.orgId, params.category, params.since);
  let total = 0;
  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const client of params.clients) {
    try {
      const built = await params.buildText(client.id);
      if (!built || built.skip) continue;
      const result = await sendToClientGroups(client.id, built.text, params.category, {
        skipGroupIds: skipSet,
      });
      total += result.total + result.skipped;
      sent += result.sent;
      skipped += result.skipped;
      failed += result.results.filter((r) => !r.sent && !r.mock).length;
    } catch (err) {
      failed++;
      console.error(
        `whatsapp-cron ${params.stepLabel} client ${client.id} falhou:`,
        String(err).slice(0, 300)
      );
    }
  }

  return { step: params.stepLabel, total, sent, skipped, failed };
}

export async function runWhatsappMorningCron(): Promise<MorningCronResult> {
  const now = new Date();
  const { dayStart, weekStart, monthStart } = bucketStarts(now);
  const isMonday = now.getUTCDay() === 1;
  const isFirstOfMonth = now.getUTCDate() === 1;

  // 1) Sincroniza Meta Ads (saldo + métricas dos últimos 7 dias) pra todas as contas
  const sync = await syncMetaAdsMetrics(null, { daysBack: 7 });

  const steps: CronStep[] = [];
  const orgs = await listOrgs();

  for (const orgId of orgs) {
    const clients = await listActiveClients(orgId);

    // 2) Alertas de saldo baixo — só envia se hasAnyLowBalance
    steps.push(
      await runCategory({
        category: "balance_alert",
        orgId,
        clients,
        since: dayStart,
        stepLabel: `balance_alert (org ${orgId.slice(0, 8)})`,
        buildText: async (clientId) => {
          const alert = await buildBalanceAlertText({ clientId });
          if (!alert.hasAnyLowBalance) return { text: "", skip: true };
          return { text: alert.text };
        },
      })
    );

    // 3) Relatório semanal (toda segunda-feira UTC) — 7 dias
    if (isMonday) {
      steps.push(
        await runCategory({
          category: "weekly_report",
          orgId,
          clients,
          since: weekStart,
          stepLabel: `weekly_report (org ${orgId.slice(0, 8)})`,
          buildText: async (clientId) => {
            const report = await buildClientReportText({ clientId, daysBack: 7 });
            if (!report.hasData) return { text: "", skip: true };
            return { text: report.text };
          },
        })
      );
    }

    // 4) Relatório mensal (dia 1 UTC) — 30 dias
    if (isFirstOfMonth) {
      steps.push(
        await runCategory({
          category: "monthly_report",
          orgId,
          clients,
          since: monthStart,
          stepLabel: `monthly_report (org ${orgId.slice(0, 8)})`,
          buildText: async (clientId) => {
            const report = await buildClientReportText({ clientId, daysBack: 30 });
            if (!report.hasData) return { text: "", skip: true };
            return { text: report.text };
          },
        })
      );
    }
  }

  return {
    sync,
    steps,
    ran_at: now.toISOString(),
    date: now.toISOString().slice(0, 10),
  };
}

export async function runWhatsappEveningCron(): Promise<EveningCronResult> {
  const now = new Date();
  const { dayStart } = bucketStarts(now);

  const steps: CronStep[] = [];
  const orgs = await listOrgs();

  for (const orgId of orgs) {
    const clients = await listActiveClients(orgId);

    // Relatório diário — 1 dia
    steps.push(
      await runCategory({
        category: "daily_report",
        orgId,
        clients,
        since: dayStart,
        stepLabel: `daily_report (org ${orgId.slice(0, 8)})`,
        buildText: async (clientId) => {
          const report = await buildClientReportText({ clientId, daysBack: 1 });
          if (!report.hasData) return { text: "", skip: true };
          return { text: report.text };
        },
      })
    );
  }

  return {
    steps,
    ran_at: now.toISOString(),
    date: now.toISOString().slice(0, 10),
  };
}
