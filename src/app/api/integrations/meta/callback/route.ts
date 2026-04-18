export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  consumeOAuthState,
  getAdPlatformConfig,
} from "@/lib/services/ad-integrations";
import { createMetaAdsClient, isMetaAdsConfigured } from "@/lib/ads/meta/client";
import { logActivity } from "@/lib/services/activity-log";
import { APP_URL } from "@/lib/utils/constants";
import type { MetaAdsConfig } from "@/lib/ads/meta/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(
      `${APP_URL}/?meta_error=${encodeURIComponent(searchParams.get("error_description") ?? error)}`
    );
  }
  if (!code || !state) {
    return NextResponse.json({ error: "missing_code_or_state" }, { status: 400 });
  }

  const stateRecord = await consumeOAuthState(state);
  if (!stateRecord || stateRecord.platform !== "meta") {
    return NextResponse.json({ error: "invalid_state" }, { status: 400 });
  }

  const config = await getAdPlatformConfig(stateRecord.organization_id, "meta");
  if (!isMetaAdsConfigured(config as MetaAdsConfig | null)) {
    return NextResponse.json({ error: "meta_ads_not_configured" }, { status: 503 });
  }

  const meta = createMetaAdsClient(config as MetaAdsConfig);
  const redirectUri = `${APP_URL}/api/integrations/meta/callback`;

  try {
    const tokenRes = await meta.exchangeCodeForToken(code, redirectUri);
    const longLived = await meta.exchangeForLongLivedToken(tokenRes.access_token);
    const expiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
      : null;

    const accounts = await meta.listAdAccounts(longLived.access_token);

    const supabase = createAdminClient();

    if (accounts.length === 0) {
      await logActivity({
        clientId: stateRecord.client_id,
        action: "meta_ads_no_accounts",
        description: "OAuth Meta concluído, mas nenhuma conta de anúncios foi autorizada.",
        actorType: "client",
      });
    }

    for (const account of accounts) {
      await supabase.from("ad_integrations").upsert(
        {
          client_id: stateRecord.client_id,
          organization_id: stateRecord.organization_id,
          platform: "meta",
          external_account_id: account.account_id,
          external_account_name: account.name,
          access_token: longLived.access_token,
          refresh_token: null,
          expires_at: expiresAt,
          granted_scopes: ["ads_read", "ads_management", "business_management", "read_insights"],
          status: "connected",
          connected_at: new Date().toISOString(),
          metadata: {
            currency: account.currency,
            account_status: account.account_status,
            business_name: account.business_name,
            timezone: account.timezone_name,
            fb_id: account.id,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "client_id,platform,external_account_id" }
      );
    }

    await logActivity({
      clientId: stateRecord.client_id,
      action: "meta_ads_connected",
      description: `Meta Ads conectado (${accounts.length} conta${accounts.length === 1 ? "" : "s"})`,
      actorType: "client",
      metadata: { accounts: accounts.map((a) => a.account_id) },
    });

    const redirectAfter = stateRecord.redirect_after ?? "/";
    return NextResponse.redirect(`${APP_URL}${redirectAfter}?connected=meta`);
  } catch (err) {
    console.error("Meta OAuth callback error", err);
    await logActivity({
      clientId: stateRecord.client_id,
      action: "meta_ads_connect_failed",
      description: `Falha ao conectar Meta Ads: ${String(err)}`,
      actorType: "client",
    });
    return NextResponse.redirect(
      `${APP_URL}${stateRecord.redirect_after ?? "/"}?meta_error=connect_failed`
    );
  }
}
