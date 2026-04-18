export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getClientByToken } from "@/lib/services/portal-auth";
import {
  createOAuthState,
  getMetaAdsConfigForClient,
} from "@/lib/services/ad-integrations";
import { createMetaAdsClient, isMetaAdsConfigured } from "@/lib/ads/meta/client";
import { APP_URL } from "@/lib/utils/constants";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });

  const client = await getClientByToken(token);
  if (!client) return NextResponse.json({ error: "invalid_token" }, { status: 404 });

  const { config } = await getMetaAdsConfigForClient(client.id);
  if (!isMetaAdsConfigured(config)) {
    return NextResponse.json({ error: "meta_ads_not_configured" }, { status: 503 });
  }

  const state = await createOAuthState(client.id, client.organization_id, "meta", `/portal/${token}/connect`);
  const redirectUri = `${APP_URL}/api/integrations/meta/callback`;
  const authorizeUrl = createMetaAdsClient(config!).buildAuthorizeUrl(redirectUri, state);

  return NextResponse.redirect(authorizeUrl);
}
