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

export interface ManualMetricInput {
  date: string;
  qualified_leads: number;
  sales_count: number;
  revenue: number;
  notes?: string;
}

export async function saveManualMetrics(
  clientId: string,
  entries: ManualMetricInput[]
): Promise<{ saved: number }> {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");

  const supabase = await createServerClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) throw new Error("Cliente não encontrado");

  const rows = entries.map((e) => ({
    client_id: clientId,
    date: e.date,
    qualified_leads: Math.max(0, Math.floor(e.qualified_leads)),
    sales_count: Math.max(0, Math.floor(e.sales_count)),
    revenue: Math.max(0, Number(e.revenue)),
    notes: e.notes ?? null,
    updated_by: session.user.id,
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) return { saved: 0 };

  const { error } = await supabase
    .from("client_manual_metrics")
    .upsert(rows, { onConflict: "client_id,date" });

  if (error) throw new Error(`Falha ao salvar métricas: ${error.message}`);

  revalidatePath(`/clients/${clientId}`);
  return { saved: rows.length };
}
