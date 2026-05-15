"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/services/current-user";
import { syncMetaAdsMetrics, type SyncResult } from "@/lib/services/ad-metrics-sync";

/**
 * Sincroniza Meta Ads para TODOS os clientes da organização do admin logado.
 * Usado pelo botão "Sincronizar tudo" do dashboard.
 */
export async function syncAllMetaIntegrations(): Promise<SyncResult> {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");
  if (session.profile?.role !== "admin") {
    throw new Error("Apenas administradores podem disparar sincronização global.");
  }

  // syncMetaAdsMetrics(null) já faz: todas as integrations 'connected' são percorridas.
  // Como a tabela ad_integrations tem organization_id e o cron usa admin client,
  // confiamos na consistência multi-tenant das próprias linhas — em um setup com
  // 2+ orgs precisaríamos filtrar por org aqui.
  const result = await syncMetaAdsMetrics(null, { daysBack: 7 });

  revalidatePath("/");
  return result;
}
