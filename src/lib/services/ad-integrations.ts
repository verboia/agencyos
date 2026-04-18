import { createAdminClient } from "@/lib/supabase/admin";
import type { MetaAdsConfig } from "@/lib/ads/meta/types";

export async function getAdPlatformConfig(
  organizationId: string,
  platform: "meta" | "google" | "tiktok"
) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("ad_platform_configs")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("platform", platform)
    .maybeSingle();
  return data;
}

export async function getMetaAdsConfigForClient(
  clientId: string
): Promise<{ config: MetaAdsConfig | null; organizationId: string | null }> {
  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from("clients")
    .select("organization_id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) return { config: null, organizationId: null };
  const config = await getAdPlatformConfig(client.organization_id, "meta");
  return { config: config as MetaAdsConfig | null, organizationId: client.organization_id };
}

export async function createOAuthState(
  clientId: string,
  organizationId: string,
  platform: "meta" | "google" | "tiktok",
  redirectAfter?: string
): Promise<string> {
  const supabase = createAdminClient();
  const state = cryptoRandomToken();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  await supabase.from("ad_oauth_states").insert({
    state,
    client_id: clientId,
    organization_id: organizationId,
    platform,
    redirect_after: redirectAfter ?? null,
    expires_at: expiresAt,
  });
  return state;
}

export async function consumeOAuthState(state: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("ad_oauth_states").select("*").eq("state", state).maybeSingle();
  if (!data) return null;
  await supabase.from("ad_oauth_states").delete().eq("state", state);
  if (new Date(data.expires_at) < new Date()) return null;
  return data;
}

function cryptoRandomToken(): string {
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && "getRandomValues" in crypto) {
    crypto.getRandomValues(bytes);
  }
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
