import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { KanbanBoard } from "@/components/tasks/kanban-board";
import { getCurrentUser } from "@/lib/services/current-user";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ClientTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentUser();
  const supabase = await createServerClient();

  const [{ data: client }, { data: tasks }, { data: profiles }] = await Promise.all([
    supabase.from("clients").select("id, company_name").eq("id", id).maybeSingle(),
    supabase
      .from("tasks")
      .select("*, assigned_profile:profiles!tasks_assigned_to_fkey(full_name), client:clients(company_name)")
      .eq("client_id", id)
      .order("sort_order"),
    supabase.from("profiles").select("id, full_name, role"),
  ]);

  if (!client) notFound();

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/clients/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tarefas — {client.company_name}</h1>
        </div>
      </div>
      <KanbanBoard
        tasks={tasks ?? []}
        profiles={profiles ?? []}
        clientId={id}
        currentUserId={session?.profile?.id}
        showClient={false}
      />
    </div>
  );
}
