import { createAdminClient } from "@/lib/supabase/admin";
import { createEvolutionClient, isEvolutionConfigured } from "@/lib/evolution/client";
import { logActivity } from "@/lib/services/activity-log";
import { APP_URL } from "@/lib/utils/constants";

async function getConfig() {
  const supabase = createAdminClient();
  const { data } = await supabase.from("evolution_config").select("*").limit(1).maybeSingle();
  return data;
}

export async function sendWhatsAppMessage(to: string, text: string): Promise<boolean> {
  const config = await getConfig();
  if (!isEvolutionConfigured(config)) {
    console.log(`[Evolution mock] to=${to} msg=${text.slice(0, 60)}…`);
    return false;
  }
  try {
    const client = createEvolutionClient(config!);
    await client.sendText(to, text);
    return true;
  } catch (err) {
    console.error("Evolution send failed", err);
    return false;
  }
}

export async function createClientWhatsAppGroup(clientId: string) {
  const supabase = createAdminClient();
  const config = await getConfig();

  const { data: client } = await supabase.from("clients").select("*").eq("id", clientId).single();
  if (!client) return;

  if (!isEvolutionConfigured(config)) {
    await logActivity({
      clientId,
      action: "whatsapp_group_skipped",
      description: "Grupo WhatsApp pulado (Evolution não configurada) — criação manual necessária",
      actorType: "system",
    });
    return;
  }

  try {
    const evo = createEvolutionClient(config!);
    const group = await evo.createGroup(`[Adria] ${client.company_name} — Máquina de Vendas`, [client.contact_phone]);
    await supabase
      .from("clients")
      .update({ whatsapp_group_id: group.id, whatsapp_group_created: true })
      .eq("id", clientId);

    const portalUrl = `${APP_URL}/portal/${client.public_token}`;
    const welcome = `👋 Olá ${client.contact_name}! Bem-vindo(a) à Adria.\n\nEste é o grupo exclusivo para acompanharmos sua estratégia de geração de demanda.\n\nSeu portal: ${portalUrl}\n\nQualquer dúvida, é só chamar. Vamos juntos! 🚀`;
    await evo.sendText(group.id, welcome);

    await logActivity({
      clientId,
      action: "whatsapp_group_created",
      description: `Grupo WhatsApp criado automaticamente`,
      actorType: "system",
    });

    await supabase
      .from("tasks")
      .update({ status: "done", completed_at: new Date().toISOString() })
      .eq("client_id", clientId)
      .ilike("title", "%grupo whatsapp%");
  } catch (err) {
    console.error("Evolution group failed", err);
    await logActivity({
      clientId,
      action: "whatsapp_group_failed",
      description: `Falha ao criar grupo WhatsApp: ${String(err)}`,
      actorType: "system",
    });
  }
}

export async function sendReportViaWhatsApp(reportId: string) {
  const supabase = createAdminClient();
  const { data: report } = await supabase
    .from("performance_reports")
    .select("*, client:clients(id, company_name, contact_phone, public_token, whatsapp_group_id)")
    .eq("id", reportId)
    .single();
  if (!report) return;
  const client = Array.isArray(report.client) ? report.client[0] : report.client;
  if (!client) return;

  const to = client.whatsapp_group_id ?? client.contact_phone;
  const url = `${APP_URL}/portal/${client.public_token}/reports/${reportId}`;
  const text = `📊 Relatório de Performance\n\n💰 Investido: R$ ${report.ad_spend ?? 0}\n👀 Impressões: ${report.impressions ?? 0}\n🖱 Cliques: ${report.clicks ?? 0}\n📱 Leads: ${report.leads ?? 0}\n💵 CPL: R$ ${report.cpl ?? 0}\n\nVeja completo: ${url}`;

  const sent = await sendWhatsAppMessage(to, text);
  if (sent) {
    await supabase.from("performance_reports").update({ sent_via_whatsapp: true, status: "sent" }).eq("id", reportId);
  }
  return sent;
}
