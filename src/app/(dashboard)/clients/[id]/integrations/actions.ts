"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/services/current-user";
import { createServerClient } from "@/lib/supabase/server";
import { syncMetaAdsMetrics, type SyncResult } from "@/lib/services/ad-metrics-sync";

export async function syncClientMetaMetrics(
  clientId: string,
  daysBack = 7
): Promise<SyncResult> {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");

  // Valida que o cliente pertence à org do usuário (RLS implicito via server client)
  const supabase = await createServerClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) throw new Error("Cliente não encontrado");

  const result = await syncMetaAdsMetrics(clientId, { daysBack });

  revalidatePath(`/clients/${clientId}`);
  return result;
}
