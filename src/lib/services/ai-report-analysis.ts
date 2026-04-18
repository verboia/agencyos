import { createAdminClient } from "@/lib/supabase/admin";
import { generateAnalysis } from "@/lib/anthropic/client";

export async function generateReportAnalysis(reportId: string): Promise<string | null> {
  const supabase = createAdminClient();
  const { data: report } = await supabase
    .from("performance_reports")
    .select("*, client:clients(company_name, segment)")
    .eq("id", reportId)
    .single();
  if (!report) return null;

  const client = Array.isArray(report.client) ? report.client[0] : report.client;

  const prompt = [
    `Cliente: ${client?.company_name ?? "—"} (${client?.segment ?? "segmento não informado"})`,
    `Período: ${report.period_start} → ${report.period_end}`,
    "",
    "Métricas do período:",
    `- Investido: R$ ${report.ad_spend ?? 0}`,
    `- Impressões: ${report.impressions ?? 0}`,
    `- Cliques: ${report.clicks ?? 0}`,
    `- CTR: ${((report.ctr ?? 0) * 100).toFixed(2)}%`,
    `- CPC: R$ ${report.cpc ?? 0}`,
    `- Leads: ${report.leads ?? 0}`,
    `- CPL: R$ ${report.cpl ?? 0}`,
    `- Conversões: ${report.conversions ?? 0}`,
    `- Leads contatados: ${report.leads_contacted ?? 0}`,
    `- Leads qualificados: ${report.leads_qualified ?? 0}`,
    `- Agendamentos: ${report.appointments_booked ?? 0}`,
    "",
    "Gere uma análise executiva clara e acionável para o cliente.",
  ].join("\n");

  const analysis = await generateAnalysis(prompt);
  await supabase.from("performance_reports").update({ ai_analysis: analysis }).eq("id", reportId);
  return analysis;
}
