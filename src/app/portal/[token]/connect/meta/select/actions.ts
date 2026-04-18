"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientByToken } from "@/lib/services/portal-auth";
import { logActivity } from "@/lib/services/activity-log";

export async function confirmMetaAccountSelection(
  token: string,
  selectedExternalIds: string[]
): Promise<void> {
  const client = await getClientByToken(token);
  if (!client) throw new Error("Cliente não encontrado");

  const supabase = createAdminClient();

  // Busca todas as pendentes desse cliente
  const { data: pendings } = await supabase
    .from("ad_integrations")
    .select("id, external_account_id, external_account_name")
    .eq("client_id", client.id)
    .eq("platform", "meta")
    .eq("status", "pending_selection");

  if (!pendings || pendings.length === 0) {
    redirect(`/portal/${token}/connect`);
  }

  const selected = pendings!.filter((p) => selectedExternalIds.includes(p.external_account_id));
  const rejected = pendings!.filter((p) => !selectedExternalIds.includes(p.external_account_id));

  if (selected.length > 0) {
    await supabase
      .from("ad_integrations")
      .update({
        status: "connected",
        connected_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in(
        "id",
        selected.map((s) => s.id)
      );
  }

  if (rejected.length > 0) {
    await supabase
      .from("ad_integrations")
      .delete()
      .in(
        "id",
        rejected.map((r) => r.id)
      );
  }

  await logActivity({
    clientId: client.id,
    action: "meta_ads_accounts_selected",
    description: `Cliente vinculou ${selected.length} conta${selected.length === 1 ? "" : "s"} Meta Ads (descartou ${rejected.length}).`,
    actorType: "client",
    metadata: {
      connected: selected.map((s) => s.external_account_id),
      rejected: rejected.map((r) => r.external_account_id),
    },
  });

  revalidatePath(`/portal/${token}/connect`);
  revalidatePath(`/clients/${client.id}`);
  redirect(`/portal/${token}/connect?connected=meta&accounts=${selected.length}`);
}
