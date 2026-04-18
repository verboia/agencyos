import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOrgAdmins } from "@/lib/services/notifications";

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

export async function calculateHealthScoreForClient(clientId: string) {
  const supabase = createAdminClient();

  const [{ data: client }, { data: tasks }, { data: invoices }, { data: reports }, { data: activity }] = await Promise.all([
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("tasks").select("status, due_date, completed_at, created_at").eq("client_id", clientId),
    supabase.from("billing_invoices").select("status, due_date, paid_at").eq("client_id", clientId),
    supabase.from("performance_reports").select("cpl, ad_spend, leads, period_start").eq("client_id", clientId).order("period_start", { ascending: false }).limit(3),
    supabase.from("activity_log").select("actor_type, created_at").eq("client_id", clientId).order("created_at", { ascending: false }).limit(30),
  ]);

  if (!client) return null;

  // Financeiro (25%)
  const recentInvoices = (invoices ?? []).slice(-6);
  const onTime = recentInvoices.filter((i) => i.status === "received").length;
  const total = recentInvoices.length || 1;
  const hasOverdue = (invoices ?? []).some((i) => i.status === "overdue");
  const financialScore = clamp((onTime / total) * 100 - (hasOverdue ? 30 : 0));

  // Performance (30%)
  let performanceScore = 70;
  if (reports && reports.length >= 2 && reports[0].cpl != null && reports[1].cpl != null) {
    const trend = Number(reports[1].cpl) - Number(reports[0].cpl);
    performanceScore = clamp(70 + (trend > 0 ? 15 : -15));
  }

  // Engajamento (20%)
  const last30dActivity = (activity ?? []).filter((a) => {
    const days = (Date.now() - new Date(a.created_at).getTime()) / 86400000;
    return days <= 30;
  });
  const clientActivities = last30dActivity.filter((a) => a.actor_type === "client").length;
  const engagementScore = clamp(60 + clientActivities * 5);

  // Execução (15%)
  const completedTasks = (tasks ?? []).filter((t) => t.status === "done");
  const onTimeTasks = completedTasks.filter((t) => {
    if (!t.due_date || !t.completed_at) return true;
    return new Date(t.completed_at) <= new Date(t.due_date);
  }).length;
  const taskScore = completedTasks.length > 0 ? clamp((onTimeTasks / completedTasks.length) * 100) : 70;

  // Satisfação (10%) — placeholder
  const satisfactionScore = 75;

  const overall = Math.round(
    performanceScore * 0.3 +
      financialScore * 0.25 +
      engagementScore * 0.2 +
      taskScore * 0.15 +
      satisfactionScore * 0.1
  );

  const health_status = overall >= 70 ? "healthy" : overall >= 40 ? "attention" : "critical";
  const alerts: Array<{ type: string; message: string; severity: string }> = [];
  if (hasOverdue) alerts.push({ type: "financial", message: "Fatura vencida sem pagamento", severity: "high" });
  if (performanceScore < 50) alerts.push({ type: "performance", message: "CPL em tendência de alta", severity: "medium" });
  if (engagementScore < 40) alerts.push({ type: "engagement", message: "Cliente sem interação nos últimos 30 dias", severity: "medium" });

  // Busca score anterior para detectar queda de faixa
  const { data: lastScore } = await supabase
    .from("client_health_scores")
    .select("health_status")
    .eq("client_id", clientId)
    .order("calculated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("client_health_scores").insert({
    client_id: clientId,
    overall_score: overall,
    financial_score: Math.round(financialScore),
    performance_score: Math.round(performanceScore),
    engagement_score: Math.round(engagementScore),
    task_score: Math.round(taskScore),
    satisfaction_score: satisfactionScore,
    score_breakdown: {
      financial: { on_time_invoices: onTime, total_invoices: total, has_overdue: hasOverdue },
      performance: reports,
      engagement: { client_activities_30d: clientActivities },
      task: { completed: completedTasks.length, on_time: onTimeTasks },
    },
    health_status,
    alerts,
    period_start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    period_end: new Date().toISOString().slice(0, 10),
  });

  if (lastScore && lastScore.health_status !== health_status) {
    const severity = health_status === "critical" ? "urgente" : "atenção";
    await notifyOrgAdmins({
      organizationId: client.organization_id,
      title: `Health score: ${severity} em ${client.company_name}`,
      body: `Score atual: ${overall}. Status anterior: ${lastScore.health_status}, atual: ${health_status}.`,
      link: `/clients/${client.id}`,
    });
  }

  return { overall, health_status, alerts };
}
