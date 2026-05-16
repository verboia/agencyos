import { createAdminClient } from "@/lib/supabase/admin";
import { createWapiClient, isWapiConfigured } from "@/lib/wapi/client";
import type { WapiConfig } from "@/lib/wapi/types";
import { APP_URL } from "@/lib/utils/constants";

interface SendOptions {
  organizationId: string;
  clientId?: string | null;
  groupId: string;
  message: string;
  category: SendCategory;
  metadata?: Record<string, unknown>;
}

export type SendCategory =
  | "manual"
  | "weekly_report"
  | "daily_report"
  | "monthly_report"
  | "balance_alert"
  | "reminder";

export interface SendResult {
  sent: boolean;
  mock: boolean;
  error?: string;
  messageId?: string;
}

async function getWapiConfig(organizationId: string): Promise<WapiConfig | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("wapi_config")
    .select("instance_id, token, is_active")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return (data as WapiConfig | null) ?? null;
}

/**
 * Envia uma mensagem de texto via W-API e grava log em whatsapp_send_logs.
 * Aceita tanto groupId (xxx@g.us) quanto número individual.
 */
export async function sendWhatsAppMessage(opts: SendOptions): Promise<SendResult> {
  const supabase = createAdminClient();
  const config = await getWapiConfig(opts.organizationId);

  if (!isWapiConfigured(config)) {
    console.log(`[W-API mock] to=${opts.groupId} category=${opts.category} msg=${opts.message.slice(0, 80)}…`);
    await supabase.from("whatsapp_send_logs").insert({
      organization_id: opts.organizationId,
      client_id: opts.clientId ?? null,
      group_id: opts.groupId,
      category: opts.category,
      message: opts.message,
      status: "mock",
      metadata: opts.metadata ?? null,
    });
    return { sent: false, mock: true };
  }

  try {
    const client = createWapiClient(config!);
    const response = await client.sendText(opts.groupId, opts.message);
    const messageId = response.messageId ?? response.id;

    await supabase.from("whatsapp_send_logs").insert({
      organization_id: opts.organizationId,
      client_id: opts.clientId ?? null,
      group_id: opts.groupId,
      category: opts.category,
      message: opts.message,
      status: "sent",
      external_message_id: messageId ?? null,
      metadata: opts.metadata ?? null,
    });

    return { sent: true, mock: false, messageId };
  } catch (err) {
    const errorMessage = String(err).slice(0, 500);
    console.error("W-API sendText failed", err);

    await supabase.from("whatsapp_send_logs").insert({
      organization_id: opts.organizationId,
      client_id: opts.clientId ?? null,
      group_id: opts.groupId,
      category: opts.category,
      message: opts.message,
      status: "failed",
      error_message: errorMessage,
      metadata: opts.metadata ?? null,
    });
    return { sent: false, mock: false, error: errorMessage };
  }
}

/**
 * Envia mensagem para todos os grupos vinculados a um cliente que tenham o
 * propósito compatível com a categoria solicitada.
 */
export async function sendToClientGroups(
  clientId: string,
  message: string,
  category: SendCategory,
  options: {
    metadata?: Record<string, unknown>;
    onlyBalanceAlerts?: boolean;
    skipGroupIds?: Set<string>;
  } = {}
): Promise<{ total: number; sent: number; skipped: number; results: SendResult[] }> {
  const supabase = createAdminClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, organization_id, company_name")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return { total: 0, sent: 0, skipped: 0, results: [] };

  const { data: groups } = await supabase
    .from("client_whatsapp_groups")
    .select("group_id, send_weekly_report, send_daily_report, send_monthly_report, send_balance_alerts")
    .eq("client_id", clientId)
    .eq("is_active", true);
  const all = groups ?? [];

  const applicable = all.filter((g) => {
    if (options.onlyBalanceAlerts || category === "balance_alert") return g.send_balance_alerts;
    if (category === "weekly_report") return g.send_weekly_report;
    if (category === "daily_report") return g.send_daily_report;
    if (category === "monthly_report") return g.send_monthly_report;
    return true; // manual / reminder vai pra todos os grupos ativos
  });

  const skip = options.skipGroupIds;
  const filtered = skip ? applicable.filter((g) => !skip.has(g.group_id)) : applicable;
  const skipped = applicable.length - filtered.length;

  const results: SendResult[] = [];
  let sent = 0;
  for (const g of filtered) {
    const result = await sendWhatsAppMessage({
      organizationId: client.organization_id,
      clientId: client.id,
      groupId: g.group_id,
      message,
      category,
      metadata: options.metadata,
    });
    results.push(result);
    if (result.sent) sent++;
  }
  return { total: filtered.length, sent, skipped, results };
}

/**
 * Retorna conjunto de group_ids que já receberam um envio da categoria desde `since`.
 * Usado por crons pra evitar reenvio.
 */
export async function getRecentlySentGroupIds(
  organizationId: string,
  category: SendCategory,
  since: Date
): Promise<Set<string>> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("whatsapp_send_logs")
    .select("group_id")
    .eq("organization_id", organizationId)
    .eq("category", category)
    .in("status", ["sent", "mock"])
    .gte("sent_at", since.toISOString());
  return new Set((data ?? []).map((r) => r.group_id as string));
}

/**
 * Envia um relatório de performance (linha simples de texto) para os grupos
 * vinculados ao cliente. Usado pelo botão "Enviar relatório agora" e pelo
 * fluxo de publicação de relatório.
 */
export async function sendReportViaWhatsApp(reportId: string): Promise<boolean> {
  const supabase = createAdminClient();
  const { data: report } = await supabase
    .from("performance_reports")
    .select(
      "id, client_id, ad_spend, impressions, clicks, leads, cpl, period_start, period_end, client:clients(id, organization_id, company_name, public_token)"
    )
    .eq("id", reportId)
    .single();
  if (!report) return false;
  const client = Array.isArray(report.client) ? report.client[0] : report.client;
  if (!client) return false;

  const url = `${APP_URL}/portal/${client.public_token}/reports/${reportId}`;
  const text = `📊 *Relatório de Performance* — ${client.company_name}\n\n💰 Investido: R$ ${report.ad_spend ?? 0}\n👀 Impressões: ${report.impressions ?? 0}\n🖱 Cliques: ${report.clicks ?? 0}\n📱 Leads: ${report.leads ?? 0}\n💵 CPL: R$ ${report.cpl ?? 0}\n\nRelatório completo: ${url}`;

  const result = await sendToClientGroups(client.id, text, "manual");

  if (result.sent > 0) {
    await supabase
      .from("performance_reports")
      .update({ sent_via_whatsapp: true, status: "sent" })
      .eq("id", reportId);
    return true;
  }
  return false;
}

/**
 * Versão direta sem cliente: usado pelos lembretes de briefing/contrato que
 * mandam mensagem 1-a-1 (não em grupo).
 */
export async function sendDirectMessage(
  organizationId: string,
  to: string,
  message: string,
  category: SendCategory = "reminder"
): Promise<SendResult> {
  return sendWhatsAppMessage({
    organizationId,
    clientId: null,
    groupId: to,
    message,
    category,
  });
}
