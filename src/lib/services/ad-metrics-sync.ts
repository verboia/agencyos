import { createAdminClient } from "@/lib/supabase/admin";
import {
  createMetaAdsClient,
  extractLeadsFromActions,
  extractMessagingConversationsFromActions,
  isMetaAdsConfigured,
} from "@/lib/ads/meta/client";
import { getAdPlatformConfig } from "@/lib/services/ad-integrations";
import type { MetaAdsConfig } from "@/lib/ads/meta/types";

export interface SyncResult {
  synced: number;
  failed: number;
  total: number;
  errors: Array<{ integration_id: string; error: string }>;
  days: { since: string; until: string };
}

export interface SyncOptions {
  since?: string;
  until?: string;
  daysBack?: number;
}

/**
 * Sincroniza métricas Meta Ads para todas as integrations 'connected' de um cliente.
 * Se `clientId` for null/undefined, sincroniza todas as integrations 'connected' da plataforma.
 */
export async function syncMetaAdsMetrics(
  clientId: string | null,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const supabase = createAdminClient();
  const daysBack = options.daysBack ?? 2;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const untilDate = new Date(today);
  untilDate.setDate(untilDate.getDate() - 1);
  const sinceDate = new Date(today);
  sinceDate.setDate(sinceDate.getDate() - daysBack);

  const since = options.since ?? sinceDate.toISOString().slice(0, 10);
  const until = options.until ?? untilDate.toISOString().slice(0, 10);

  let query = supabase
    .from("ad_integrations")
    .select("*")
    .eq("platform", "meta")
    .eq("status", "connected");

  if (clientId) query = query.eq("client_id", clientId);

  const { data: integrations } = await query;

  if (!integrations || integrations.length === 0) {
    return { synced: 0, failed: 0, total: 0, errors: [], days: { since, until } };
  }

  const configCache = new Map<string, MetaAdsConfig | null>();
  let synced = 0;
  let failed = 0;
  const errors: Array<{ integration_id: string; error: string }> = [];

  for (const integration of integrations) {
    try {
      let config = configCache.get(integration.organization_id);
      if (config === undefined) {
        config = (await getAdPlatformConfig(integration.organization_id, "meta")) as
          | MetaAdsConfig
          | null;
        configCache.set(integration.organization_id, config);
      }
      if (!isMetaAdsConfigured(config)) {
        failed++;
        errors.push({ integration_id: integration.id, error: "platform_not_configured" });
        continue;
      }

      const meta = createMetaAdsClient(config!);
      const rows = await meta.getDailyInsights(
        integration.external_account_id,
        integration.access_token,
        since,
        until
      );

      for (const row of rows) {
        const spend = Number(row.spend ?? 0);
        const impressions = Number(row.impressions ?? 0);
        const clicks = Number(row.clicks ?? 0);
        const ctr = row.ctr ? Number(row.ctr) / 100 : null;
        const cpc = row.cpc ? Number(row.cpc) : null;
        const cpm = row.cpm ? Number(row.cpm) : null;
        const leads = extractLeadsFromActions(row.actions);
        const messagingConversations = extractMessagingConversationsFromActions(row.actions);
        // Se a campanha é Click to WhatsApp, conversas iniciadas são a melhor proxy de lead.
        const effectiveLeads = leads > 0 ? leads : messagingConversations;
        const cpl = effectiveLeads > 0 ? spend / effectiveLeads : null;

        await supabase.from("ad_metrics_daily").upsert(
          {
            client_id: integration.client_id,
            integration_id: integration.id,
            platform: "meta",
            external_account_id: integration.external_account_id,
            date: row.date_start,
            spend,
            impressions,
            clicks,
            leads: effectiveLeads,
            messaging_conversations: messagingConversations,
            conversions: effectiveLeads,
            ctr,
            cpc,
            cpm,
            cpl,
            raw: row as unknown as Record<string, unknown>,
            synced_at: new Date().toISOString(),
          },
          { onConflict: "integration_id,date" }
        );
      }

      await supabase
        .from("ad_integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_error: null,
          status: "connected",
        })
        .eq("id", integration.id);

      synced++;
    } catch (err) {
      failed++;
      const message = String(err);
      errors.push({ integration_id: integration.id, error: message });

      const isAuthError = /OAuthException|190|token|expired/i.test(message);
      await supabase
        .from("ad_integrations")
        .update({
          last_sync_at: new Date().toISOString(),
          last_sync_error: message.slice(0, 500),
          status: isAuthError ? "expired" : "error",
        })
        .eq("id", integration.id);
    }
  }

  return { synced, failed, total: integrations.length, errors, days: { since, until } };
}
