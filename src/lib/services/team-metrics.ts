import { createAdminClient } from "@/lib/supabase/admin";

export async function computeDailyMetrics(organizationId: string, date: Date = new Date()) {
  const supabase = createAdminClient();
  const dateStr = date.toISOString().slice(0, 10);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId);

  if (!profiles) return;

  for (const profile of profiles) {
    const { data: tasks } = await supabase
      .from("tasks")
      .select("status, due_date, completed_at, client_id")
      .eq("assigned_to", profile.id)
      .gte("completed_at", `${dateStr}T00:00:00`)
      .lte("completed_at", `${dateStr}T23:59:59`);

    const completedOnDate = tasks ?? [];
    const tasksCompleted = completedOnDate.length;
    const tasksOnTime = completedOnDate.filter((t) => {
      if (!t.due_date || !t.completed_at) return true;
      return new Date(t.completed_at) <= new Date(`${t.due_date}T23:59:59`);
    }).length;
    const tasksOverdue = tasksCompleted - tasksOnTime;

    const { count: tasksPending } = await supabase
      .from("tasks")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", profile.id)
      .in("status", ["pending", "in_progress", "blocked"]);

    const { count: clientsActive } = await supabase
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", profile.id)
      .in("status", ["active", "onboarding"]);

    const clientsContacted = new Set(completedOnDate.map((t) => t.client_id)).size;

    const totalHours = completedOnDate.reduce((sum, t) => {
      if (t.completed_at) {
        // approx: usar created_at -> completed_at
        return sum + 4;
      }
      return sum;
    }, 0);
    const avgCompletionHours = tasksCompleted > 0 ? totalHours / tasksCompleted : null;

    await supabase
      .from("team_metrics_daily")
      .upsert(
        {
          organization_id: organizationId,
          profile_id: profile.id,
          metric_date: dateStr,
          tasks_completed: tasksCompleted,
          tasks_on_time: tasksOnTime,
          tasks_overdue: tasksOverdue,
          tasks_pending: tasksPending ?? 0,
          avg_completion_hours: avgCompletionHours,
          clients_active: clientsActive ?? 0,
          clients_contacted: clientsContacted,
        },
        { onConflict: "profile_id,metric_date" }
      );
  }
}

export async function computeMonthlyMetrics(organizationId: string, month: number, year: number) {
  const supabase = createAdminClient();
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const endDate = new Date(year, month, 0).toISOString().slice(0, 10);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", organizationId);
  if (!profiles) return;

  for (const profile of profiles) {
    const { data: daily } = await supabase
      .from("team_metrics_daily")
      .select("*")
      .eq("profile_id", profile.id)
      .gte("metric_date", startDate)
      .lte("metric_date", endDate);

    const totalCompleted = (daily ?? []).reduce((sum, d) => sum + d.tasks_completed, 0);
    const totalOnTime = (daily ?? []).reduce((sum, d) => sum + d.tasks_on_time, 0);
    const onTimeRate = totalCompleted > 0 ? totalOnTime / totalCompleted : 0;
    const avgHours = (daily ?? []).filter((d) => d.avg_completion_hours != null).reduce((sum, d, _, arr) => sum + Number(d.avg_completion_hours) / arr.length, 0);

    const { data: myClients } = await supabase
      .from("clients")
      .select("id", { count: "exact", head: true })
      .eq("assigned_to", profile.id);

    const slaMet = onTimeRate >= 0.9;

    await supabase
      .from("team_metrics_monthly")
      .upsert(
        {
          organization_id: organizationId,
          profile_id: profile.id,
          metric_month: month,
          metric_year: year,
          total_tasks_completed: totalCompleted,
          on_time_rate: Number(onTimeRate.toFixed(4)),
          avg_completion_hours: avgHours || null,
          total_clients_managed: Array.isArray(myClients) ? myClients.length : 0,
          sla_met: slaMet,
          sla_details: {
            task_completion_target: 0.9,
            task_completion_actual: Number(onTimeRate.toFixed(4)),
          },
        },
        { onConflict: "profile_id,metric_month,metric_year" }
      );
  }
}
