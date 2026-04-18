"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/services/current-user";
import { logActivity } from "@/lib/services/activity-log";
import { createNotification } from "@/lib/services/notifications";

export async function updateTaskStatus(taskId: string, status: string) {
  const session = await requireUser();
  const supabase = await createServerClient();
  const patch: Record<string, unknown> = { status };
  if (status === "done") patch.completed_at = new Date().toISOString();

  const { data: task, error } = await supabase
    .from("tasks")
    .update(patch)
    .eq("id", taskId)
    .select("*, client:clients(company_name)")
    .single();

  if (error) return { error: error.message };

  if (task && status === "done") {
    const clientName = Array.isArray(task.client)
      ? (task.client[0] as { company_name?: string } | undefined)?.company_name
      : (task.client as { company_name?: string } | null)?.company_name;
    await logActivity({
      clientId: task.client_id,
      action: "task_completed",
      description: `Tarefa concluída: ${task.title}`,
      actorId: session.profile?.id,
      metadata: { clientName },
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/clients/${task?.client_id}`);
  revalidatePath(`/clients/${task?.client_id}/tasks`);
  return { success: true };
}

export async function createTask(formData: FormData) {
  const session = await requireUser();
  const supabase = await createServerClient();

  const payload = {
    client_id: String(formData.get("client_id")),
    title: String(formData.get("title")),
    description: formData.get("description")?.toString() || null,
    category: "one_time" as const,
    assigned_to: formData.get("assigned_to")?.toString() || session.profile?.id,
    priority: String(formData.get("priority") || "medium"),
    due_date: formData.get("due_date")?.toString() || null,
    status: "pending" as const,
  };

  const { data: task, error } = await supabase.from("tasks").insert(payload).select().single();
  if (error) return { error: error.message };

  if (task?.assigned_to && task.assigned_to !== session.profile?.id) {
    await createNotification({
      userId: task.assigned_to,
      title: "Nova tarefa atribuída",
      body: task.title,
      link: `/clients/${task.client_id}/tasks`,
    });
  }

  revalidatePath("/tasks");
  revalidatePath(`/clients/${payload.client_id}/tasks`);
  return { success: true, task };
}

export async function updateTask(taskId: string, patch: Record<string, unknown>) {
  const supabase = await createServerClient();
  const { error } = await supabase.from("tasks").update(patch).eq("id", taskId);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  return { success: true };
}

export async function deleteTask(taskId: string) {
  const supabase = await createServerClient();
  await supabase.from("tasks").delete().eq("id", taskId);
  revalidatePath("/tasks");
  return { success: true };
}
