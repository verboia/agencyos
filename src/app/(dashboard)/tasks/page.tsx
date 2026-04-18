import { createServerClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { getCurrentUser } from "@/lib/services/current-user";

export default async function TasksPage() {
  const session = await getCurrentUser();
  const supabase = await createServerClient();

  const [{ data: tasks }, { data: profiles }, { data: clients }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*, assigned_profile:profiles!tasks_assigned_to_fkey(full_name), client:clients(company_name)")
      .order("sort_order"),
    supabase.from("profiles").select("id, full_name, role"),
    supabase.from("clients").select("id, company_name").order("company_name"),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tarefas</h1>
        <p className="text-sm text-muted-foreground">Kanban de todas as tarefas.</p>
      </div>
      <KanbanBoard
        tasks={tasks ?? []}
        profiles={profiles ?? []}
        clients={clients ?? []}
        currentUserId={session?.profile?.id}
      />
    </div>
  );
}
