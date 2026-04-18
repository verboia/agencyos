"use server";

import { revalidatePath } from "next/cache";
import { generateReportAnalysis } from "@/lib/services/ai-report-analysis";
import { sendReportViaWhatsApp } from "@/lib/services/whatsapp";
import { createServerClient } from "@/lib/supabase/server";

export async function runAiAnalysis(reportId: string) {
  const result = await generateReportAnalysis(reportId);
  if (!result) return { error: "Falha ao gerar análise" };
  const supabase = await createServerClient();
  const { data } = await supabase.from("performance_reports").select("client_id").eq("id", reportId).single();
  if (data) revalidatePath(`/clients/${data.client_id}/reports/${reportId}`);
  return { success: true };
}

export async function sendReportWhatsApp(reportId: string) {
  const sent = await sendReportViaWhatsApp(reportId);
  if (!sent) return { error: "Mensagem simulada (Evolution não configurada). Veja logs." };
  const supabase = await createServerClient();
  const { data } = await supabase.from("performance_reports").select("client_id").eq("id", reportId).single();
  if (data) revalidatePath(`/clients/${data.client_id}/reports/${reportId}`);
  return { success: true };
}
