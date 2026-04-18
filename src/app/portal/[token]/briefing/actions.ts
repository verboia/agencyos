"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientByToken } from "@/lib/services/portal-auth";
import { logActivity } from "@/lib/services/activity-log";
import { notifyOrgAdmins } from "@/lib/services/notifications";

export async function saveBriefing(token: string, data: Record<string, unknown>, complete: boolean) {
  const client = await getClientByToken(token);
  if (!client) return { error: "Cliente não encontrado" };

  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {
    ...data,
    status: complete ? "completed" : "in_progress",
  };
  if (complete) patch.completed_at = new Date().toISOString();

  const { error } = await supabase.from("client_briefings").update(patch).eq("client_id", client.id);
  if (error) return { error: error.message };

  if (complete) {
    await logActivity({
      clientId: client.id,
      action: "briefing_submitted",
      description: `${client.contact_name} preencheu o briefing`,
      actorType: "client",
    });

    await notifyOrgAdmins({
      organizationId: client.organization_id,
      title: "Briefing recebido",
      body: `${client.company_name} preencheu o briefing.`,
      link: `/clients/${client.id}`,
    });
  }

  revalidatePath(`/portal/${token}/briefing`);
  revalidatePath(`/clients/${client.id}`);
  return { success: true };
}
