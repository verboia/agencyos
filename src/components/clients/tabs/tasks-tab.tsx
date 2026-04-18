import { createServerClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/tasks/kanban-board";

export async function ClientTasksTab({ clientId }: { clientId: string }) {
  const supabase = await createServerClient();
  const [{ data: tasks }, { data: profiles }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, assigned_profile:profiles!tasks_assigned_to_fkey(full_name), client:clients(company_name)")
      .eq("client_id", clientId)
      .order("sort_order"),
    supabase.from("profiles").select("id, full_name, role"),
  ]);

  return (
    <KanbanBoard tasks={tasks ?? []} profiles={profiles ?? []} clientId={clientId} />
  );
}
