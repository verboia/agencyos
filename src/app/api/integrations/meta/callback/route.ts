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

  const supabase = createAdminClient();
  const { data: clientRow } = await supabase
    .from("clients")
    .select("public_token")
    .eq("id", stateRecord.client_id)
    .single();

  const portalToken = clientRow?.public_token;
  const fallbackRedirect = portalToken ? `/portal/${portalToken}/connect` : "/";

  try {
    const tokenRes = await meta.exchangeCodeForToken(code, redirectUri);
    const longLived = await meta.exchangeForLongLivedToken(tokenRes.access_token);
    const expiresAt = longLived.expires_in
      ? new Date(Date.now() + longLived.expires_in * 1000).toISOString()
      : null;

    const accounts = await meta.listAdAccounts(longLived.access_token);

    if (accounts.length === 0) {
      await logActivity({
        clientId: stateRecord.client_id,
        action: "meta_ads_no_accounts",
        description: "OAuth Meta concluído, mas nenhuma conta de anúncios foi autorizada.",
        actorType: "client",
      });
      return NextResponse.redirect(`${APP_URL}${fallbackRedirect}?meta_error=no_accounts_shared`);
    }

    // Preserva contas já 'connected' do mesmo cliente para não sobrescrever a escolha prévia
    const { data: alreadyConnected } = await supabase
      .from("ad_integrations")
      .select("external_account_id")
      .eq("client_id", stateRecord.client_id)
      .eq("platform", "meta")
      .eq("status", "connected");

    const connectedIds = new Set(
      (alreadyConnected ?? []).map((r) => r.external_account_id as string)
    );

    // Limpa pendências antigas não finalizadas (do mesmo cliente + plataforma)
    await supabase
      .from("ad_integrations")
      .delete()
      .eq("client_id", stateRecord.client_id)
      .eq("platform", "meta")
      .eq("status", "pending_selection");

    let pendingCount = 0;
    for (const account of accounts) {
      if (connectedIds.has(account.account_id)) {
        // Já está conectada — só atualiza o token (pode ter sido renovado)
        await supabase
          .from("ad_integrations")
          .update({
            access_token: longLived.access_token,
            expires_at: expiresAt,
            external_account_name: account.name,
            updated_at: new Date().toISOString(),
          })
          .eq("client_id", stateRecord.client_id)
          .eq("platform", "meta")
          .eq("external_account_id", account.account_id);
        continue;
      }

      const { error: upsertError } = await supabase.from("ad_integrations").insert({
        client_id: stateRecord.client_id,
        organization_id: stateRecord.organization_id,
        platform: "meta",
        external_account_id: account.account_id,
        external_account_name: account.name,
        access_token: longLived.access_token,
        refresh_token: null,
        expires_at: expiresAt,
        granted_scopes: ["ads_read", "ads_management", "business_management"],
        status: "pending_selection",
        connected_at: null,
        metadata: {
          currency: account.currency,
          account_status: account.account_status,
          business_name: account.business_name,
          timezone: account.timezone_name,
          fb_id: account.id,
        },
      });

      if (upsertError) {
        console.error("Meta ad_integrations insert error", upsertError);
      } else {
        pendingCount++;
      }
    }

    await logActivity({
      clientId: stateRecord.client_id,
      action: "meta_ads_oauth_completed",
      description: `OAuth Meta concluído: ${accounts.length} conta${accounts.length === 1 ? "" : "s"} devolvida${accounts.length === 1 ? "" : "s"} pela API (${pendingCount} aguardando seleção).`,
      actorType: "client",
      metadata: { total: accounts.length, pending: pendingCount },
    });

    if (pendingCount === 0) {
      // Todas já estavam connected — nada novo para escolher
      return NextResponse.redirect(`${APP_URL}${fallbackRedirect}?connected=meta&accounts=${accounts.length}`);
    }

    const selectUrl = portalToken
      ? `/portal/${portalToken}/connect/meta/select`
      : fallbackRedirect;
    return NextResponse.redirect(`${APP_URL}${selectUrl}`);
  } catch (err) {
    console.error("Meta OAuth callback error", err);
    await logActivity({
      clientId: stateRecord.client_id,
      action: "meta_ads_connect_failed",
      description: `Falha ao conectar Meta Ads: ${String(err)}`,
      actorType: "client",
    });
    return NextResponse.redirect(`${APP_URL}${fallbackRedirect}?meta_error=connect_failed`);
  }
}
