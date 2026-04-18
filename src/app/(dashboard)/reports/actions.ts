"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/services/current-user";
import { logActivity } from "@/lib/services/activity-log";

export async function createReport(clientId: string, formData: FormData) {
  const session = await requireUser();
  const supabase = await createServerClient();

  const payload: Record<string, unknown> = {
    client_id: clientId,
    period_start: String(formData.get("period_start")),
    period_end: String(formData.get("period_end")),
    report_type: String(formData.get("report_type") || "monthly"),
    status: "draft",
  };

  const numericFields = [
    "ad_spend",
    "impressions",
    "clicks",
    "ctr",
    "cpc",
    "leads",
    "cpl",
    "conversions",
    "cost_per_conversion",
    "leads_contacted",
    "leads_qualified",
    "appointments_booked",
  ];
  for (const f of numericFields) {
    const v = formData.get(f);
    if (v !== null && v !== "") payload[f] = Number(v);
  }

  for (const f of ["highlights", "improvements", "next_actions"]) {
    const v = formData.get(f)?.toString();
    if (v) payload[f] = v;
  }

  const { data: report, error } = await supabase.from("performance_reports").insert(payload).select().single();
  if (error) return { error: error.message };

  await logActivity({
    clientId,
    action: "report_created",
    description: `Relatório criado (${payload.period_start} → ${payload.period_end})`,
    actorId: session.profile?.id,
  });

  revalidatePath(`/clients/${clientId}/reports`);
  revalidatePath(`/clients/${clientId}/reports/${report.id}`);
  redirect(`/clients/${clientId}/reports/${report.id}`);
}

export async function publishReport(reportId: string) {
  const session = await requireUser();
  const supabase = await createServerClient();
  const { data: report, error } = await supabase
    .from("performance_reports")
    .update({
      status: "published",
      published_at: new Date().toISOString(),
      visible_to_client: true,
    })
    .eq("id", reportId)
    .select()
    .single();
  if (error) return { error: error.message };

  await logActivity({
    clientId: report.client_id,
    action: "report_published",
    description: "Relatório publicado no portal",
    actorId: session.profile?.id,
  });

  revalidatePath(`/clients/${report.client_id}/reports/${reportId}`);
  return { success: true };
}

export async function markReportSent(reportId: string) {
  const supabase = await createServerClient();
  const { data: report, error } = await supabase
    .from("performance_reports")
    .update({ status: "sent", sent_via_whatsapp: true })
    .eq("id", reportId)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/clients/${report.client_id}/reports/${reportId}`);
  return { success: true };
}

export async function updateReport(reportId: string, patch: Record<string, unknown>) {
  const supabase = await createServerClient();
  const { data: report, error } = await supabase
    .from("performance_reports")
    .update(patch)
    .eq("id", reportId)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/clients/${report.client_id}/reports/${reportId}`);
  return { success: true };
}
