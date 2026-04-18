export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMetaAdsClient, extractLeadsFromActions, isMetaAdsConfigured } from "@/lib/ads/meta/client";
import { getAdPlatformConfig } from "@/lib/services/ad-integrations";
import type { MetaAdsConfig } from "@/lib/ads/meta/types";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();

  const { data: integrations } = await supabase
    .from("ad_integrations")
    .select("*")
    .eq("platform", "meta")
    .eq("status", "connected");

  if (!integrations || integrations.length === 0) {
    return NextResponse.json({ synced: 0, skipped: 0, failed: 0, platform: "meta" });
  }

  const configCache = new Map<string, MetaAdsConfig | null>();

  let synced = 0;
  let failed = 0;
  const errors: Array<{ integration_id: string; error: string }> = [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  const since = twoDaysAgo.toISOString().slice(0, 10);
  const until = yesterday.toISOString().slice(0, 10);

  for (const integration of integrations) {
    try {
      let config = configCache.get(integration.organization_id);
      if (config === undefined) {
        config = (await getAdPlatformConfig(integration.organization_id, "meta")) as MetaAdsConfig | null;
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
        const cpl = leads > 0 ? spend / leads : null;

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
            leads,
            conversions: leads,
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

  return NextResponse.json({ synced, failed, total: integrations.length, platform: "meta", errors });
}
