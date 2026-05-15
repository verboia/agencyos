import { createAdminClient } from "@/lib/supabase/admin";

// Formatadores específicos pro WhatsApp — não usam Intl porque queremos
// strings curtas e previsíveis, e o WhatsApp respeita *negrito*, _itálico_,
// quebras de linha e emojis.

function fmtBRL(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "R$ 0,00";
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtInt(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0";
  return Math.round(value).toLocaleString("pt-BR");
}

function fmtPct(value: number | null | undefined): string {
  if (value === null || value === undefined) return "0%";
  return `${(value * 100).toFixed(2).replace(".", ",")}%`;
}

function fmtDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const DIVIDER = "━━━━━━━━━━━━━━━━━━━";

export interface ReportTextInput {
  clientId: string;
  daysBack: number; // 7, 14, 30, etc
}

export interface ReportTextResult {
  text: string;
  hasData: boolean;
  periodLabel: string;
  totals: {
    spend: number;
    impressions: number;
    clicks: number;
    messaging: number;
    leads: number;
    qualified_leads: number;
    sales_count: number;
    revenue: number;
  };
}

/**
 * Monta o texto do relatório de performance no formato amigável pro WhatsApp.
 * Lê ad_metrics_daily (auto) + client_manual_metrics (manual) dos últimos N dias.
 */
export async function buildClientReportText(
  input: ReportTextInput
): Promise<ReportTextResult> {
  const supabase = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since = new Date(today);
  since.setDate(since.getDate() - input.daysBack);
  const sinceStr = since.toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);

  const [{ data: client }, { data: metrics }, { data: manual }] = await Promise.all([
    supabase
      .from("clients")
      .select("company_name, contact_name")
      .eq("id", input.clientId)
      .maybeSingle(),
    supabase
      .from("ad_metrics_daily")
      .select("date, spend, impressions, clicks, leads, messaging_conversations")
      .eq("client_id", input.clientId)
      .gte("date", sinceStr)
      .lte("date", todayStr),
    supabase
      .from("client_manual_metrics")
      .select("date, qualified_leads, sales_count, revenue")
      .eq("client_id", input.clientId)
      .gte("date", sinceStr)
      .lte("date", todayStr),
  ]);

  const companyName = client?.company_name ?? "—";
  const periodLabel = `${fmtDate(since)} a ${fmtDate(today)}`;

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

  const manualTotals = (manual ?? []).reduce(
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

  const periodTitle =
    input.daysBack === 7
      ? "Relatório semanal"
      : input.daysBack === 30
      ? "Relatório mensal"
      : input.daysBack === 1
      ? "Relatório de ontem"
      : `Relatório dos últimos ${input.daysBack} dias`;

  const hasData =
    totals.spend > 0 ||
    totals.impressions > 0 ||
    manualTotals.qualified_leads > 0 ||
    manualTotals.sales_count > 0;

  const lines: string[] = [];
  lines.push(`📊 *${periodTitle}* — Adria`);
  lines.push(`🏢 ${companyName}`);
  lines.push(`📅 ${periodLabel}`);
  lines.push("");
  lines.push(DIVIDER);
  lines.push("");
  lines.push("💰 *Investimento*");
  lines.push(fmtBRL(totals.spend));
  lines.push("");

  if (totals.messaging > 0) {
    lines.push("💬 *Conversas iniciadas*");
    lines.push(
      `${fmtInt(totals.messaging)} ${totals.messaging === 1 ? "conversa" : "conversas"} · ${fmtBRL(costPerConversation)} por conversa`
    );
    lines.push("");
  }

  lines.push("🖱 *Cliques*");
  lines.push(
    `${fmtInt(totals.clicks)}${totals.clicks > 0 ? ` · CPC ${fmtBRL(cpc)}` : ""}`
  );
  lines.push("");

  lines.push("👀 *Impressões*");
  lines.push(
    `${fmtInt(totals.impressions)}${totals.impressions > 0 ? ` · CTR ${fmtPct(ctr)}` : ""}`
  );

  const hasManual =
    manualTotals.qualified_leads > 0 ||
    manualTotals.sales_count > 0 ||
    manualTotals.revenue > 0;

  if (hasManual) {
    lines.push("");
    lines.push(DIVIDER);
    lines.push("");
    lines.push("✅ *Resultados reais*");
    if (manualTotals.qualified_leads > 0) {
      lines.push(
        `👥 ${fmtInt(manualTotals.qualified_leads)} leads qualificados${cplQualified > 0 ? ` · CPL ${fmtBRL(cplQualified)}` : ""}`
      );
    }
    if (manualTotals.sales_count > 0) {
      lines.push(
        `🛒 ${fmtInt(manualTotals.sales_count)} ${manualTotals.sales_count === 1 ? "venda" : "vendas"}${cac > 0 ? ` · CAC ${fmtBRL(cac)}` : ""}`
      );
    }
    if (manualTotals.revenue > 0) {
      lines.push(
        `💵 ${fmtBRL(manualTotals.revenue)} em receita${roas > 0 ? ` · *ROAS ${roas.toFixed(2).replace(".", ",")}x*` : ""}`
      );
    }
  }

  lines.push("");
  lines.push(DIVIDER);
  lines.push("");
  lines.push("_Qualquer dúvida, é só chamar aqui no grupo._");
  lines.push("Equipe Adria 🚀");

  return {
    text: lines.join("\n"),
    hasData,
    periodLabel,
    totals: {
      ...totals,
      ...manualTotals,
    },
  };
}

export interface BalanceAlertInput {
  clientId: string;
}

export interface BalanceAlertResult {
  text: string;
  hasAnyLowBalance: boolean;
  accounts: Array<{
    account_name: string;
    available: number | null;
    debt: number | null;
    daily_avg: number | null;
    days_remaining: number | null;
  }>;
}

/**
 * Monta texto de alerta de saldo Meta Ads baixo. Pega saldo cacheado em
 * ad_integrations.metadata e gasto médio dos últimos 7 dias pra estimar
 * quantos dias o saldo ainda dura.
 */
export async function buildBalanceAlertText(
  input: BalanceAlertInput,
  thresholdOverride?: number
): Promise<BalanceAlertResult> {
  const supabase = createAdminClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const since = new Date(today);
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString().slice(0, 10);

  const [{ data: client }, { data: integrations }, { data: recentSpend }] = await Promise.all([
    supabase
      .from("clients")
      .select("company_name, contact_name")
      .eq("id", input.clientId)
      .maybeSingle(),
    supabase
      .from("ad_integrations")
      .select("id, external_account_id, external_account_name, metadata")
      .eq("client_id", input.clientId)
      .eq("platform", "meta")
      .eq("status", "connected"),
    supabase
      .from("ad_metrics_daily")
      .select("integration_id, spend, date")
      .eq("client_id", input.clientId)
      .eq("platform", "meta")
      .gte("date", sinceStr),
  ]);

  const companyName = client?.company_name ?? "—";

  // Soma gasto por integration nos últimos 7 dias
  const spendByIntegration = new Map<string, number>();
  for (const row of recentSpend ?? []) {
    const key = String(row.integration_id);
    spendByIntegration.set(key, (spendByIntegration.get(key) ?? 0) + Number(row.spend ?? 0));
  }

  const accounts = (integrations ?? []).map((i) => {
    const md = (i.metadata ?? {}) as Record<string, unknown>;
    const spendCap = typeof md.spend_cap === "number" ? (md.spend_cap as number) : null;
    const amountSpent = typeof md.amount_spent === "number" ? (md.amount_spent as number) : null;
    const debt = typeof md.balance === "number" ? (md.balance as number) : null;
    const hasCap = spendCap !== null && spendCap > 0;
    // Saldo disponível = total recarregado (spend_cap) - gasto acumulado
    const available =
      hasCap && amountSpent !== null ? Math.max(spendCap - amountSpent, 0) : null;
    const recent7d = spendByIntegration.get(i.id) ?? 0;
    const dailyAvg = recent7d / 7;
    const daysRemaining =
      available !== null && available > 0 && dailyAvg > 0
        ? Math.floor(available / dailyAvg)
        : null;
    return {
      account_name: i.external_account_name ?? `Conta #${i.external_account_id}`,
      available,
      debt,
      daily_avg: dailyAvg > 0 ? dailyAvg : null,
      days_remaining: daysRemaining,
    };
  });

  // Considera "saldo baixo" pelo threshold OU se sobra <= 3 dias de ritmo atual
  const threshold = thresholdOverride ?? 100;
  const hasAnyLowBalance = accounts.some(
    (a) =>
      (a.available !== null && a.available < threshold) ||
      (a.days_remaining !== null && a.days_remaining <= 3)
  );

  const lines: string[] = [];
  lines.push(`⚠️ *Saldo da conta de anúncios*`);
  lines.push(`🏢 ${companyName}`);
  lines.push("");

  if (accounts.length === 0) {
    lines.push("Nenhuma conta Meta Ads conectada para este cliente.");
  } else {
    for (const acc of accounts) {
      lines.push(`*${acc.account_name}*`);
      if (acc.available !== null) {
        lines.push(`💳 Saldo disponível: *${fmtBRL(acc.available)}*`);
      } else {
        lines.push(`💳 Saldo: sem limite definido (pós-pago)`);
      }
      if (acc.daily_avg !== null) {
        lines.push(`📉 Gasto médio últimos 7 dias: ${fmtBRL(acc.daily_avg)}/dia`);
      }
      if (acc.days_remaining !== null) {
        const danger = acc.days_remaining <= 3 ? "🚨" : "⏳";
        lines.push(
          `${danger} Ao ritmo atual, dura *~${acc.days_remaining} ${acc.days_remaining === 1 ? "dia" : "dias"}*`
        );
      }
      if (acc.debt !== null && acc.debt > 0) {
        lines.push(`❗ Dívida em aberto: ${fmtBRL(acc.debt)}`);
      }
      lines.push("");
    }
  }

  if (hasAnyLowBalance) {
    lines.push(DIVIDER);
    lines.push("");
    lines.push("❓ *Podemos emitir um PIX pra recarga?*");
    lines.push("Quanto você quer recarregar? 💰");
    lines.push("");
    lines.push("_Pra evitar a campanha pausar, vale a pena já garantir o saldo._");
  } else {
    lines.push(DIVIDER);
    lines.push("");
    lines.push("✅ Saldo está confortável por enquanto. Avisamos quando precisar recarregar.");
  }

  lines.push("");
  lines.push("Equipe Adria 🚀");

  return {
    text: lines.join("\n"),
    hasAnyLowBalance,
    accounts,
  };
}
