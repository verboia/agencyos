import { createAdminClient } from "@/lib/supabase/admin";
import { addDays } from "date-fns";

export async function generateOnboardingTasks(clientId: string, organizationId: string, assigneeId: string | null) {
  const supabase = createAdminClient();

  const { data: templates } = await supabase
    .from("task_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("category", "onboarding")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  if (!templates || templates.length === 0) return;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("organization_id", organizationId);

  const adminId = profiles?.find((p) => p.role === "admin")?.id ?? null;
  const operatorId = assigneeId ?? profiles?.find((p) => p.role === "operator")?.id ?? adminId;

  const now = new Date();
  const tasks = templates.map((t) => ({
    client_id: clientId,
    template_id: t.id,
    title: t.title,
    description: t.description,
    category: t.category,
    assigned_to: t.default_assignee === "admin" ? adminId : operatorId,
    status: "pending",
    priority: "medium",
    due_date: t.default_due_days != null ? addDays(now, t.default_due_days).toISOString().slice(0, 10) : null,
    sort_order: t.sort_order,
  }));

  await supabase.from("tasks").insert(tasks);
}

export async function generateRecurringTasks(category: "recurring_weekly" | "recurring_monthly", organizationId: string) {
  const supabase = createAdminClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("id, assigned_to")
    .eq("organization_id", organizationId)
    .eq("status", "active");

  if (!clients || clients.length === 0) return 0;

  const { data: templates } = await supabase
    .from("task_templates")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("category", category)
    .eq("is_active", true);

  if (!templates || templates.length === 0) return 0;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("organization_id", organizationId);

  const adminId = profiles?.find((p) => p.role === "admin")?.id ?? null;

  const now = new Date();
  const allTasks: Array<Record<string, unknown>> = [];

  for (const client of clients) {
    for (const t of templates) {
      allTasks.push({
        client_id: client.id,
        template_id: t.id,
        title: t.title,
        description: t.description,
        category: t.category,
        assigned_to: t.default_assignee === "admin" ? adminId : client.assigned_to ?? null,
        status: "pending",
        priority: "medium",
        due_date: t.default_due_days != null ? addDays(now, t.default_due_days).toISOString().slice(0, 10) : null,
        sort_order: t.sort_order,
      });
    }
  }

  if (allTasks.length > 0) {
    await supabase.from("tasks").insert(allTasks);
  }

  return allTasks.length;
}
