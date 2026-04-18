import type {
  MetaAdAccount,
  MetaAdsConfig,
  MetaInsightsRow,
  MetaLongLivedTokenResponse,
  MetaTokenResponse,
} from "./types";

const DEFAULT_API_VERSION = "v21.0";

export const META_OAUTH_SCOPES = [
  "ads_read",
  "ads_management",
  "business_management",
  "read_insights",
];

export class MetaAdsClient {
  constructor(private readonly config: MetaAdsConfig) {}

  private get apiVersion() {
    return this.config.api_version || DEFAULT_API_VERSION;
  }

  private get graphUrl() {
    return `https://graph.facebook.com/${this.apiVersion}`;
  }

  buildAuthorizeUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.app_id,
      redirect_uri: redirectUri,
      state,
      scope: META_OAUTH_SCOPES.join(","),
      response_type: "code",
    });
    return `https://www.facebook.com/${this.apiVersion}/dialog/oauth?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string, redirectUri: string): Promise<MetaTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.config.app_id,
      client_secret: this.config.app_secret,
      redirect_uri: redirectUri,
      code,
    });
    const response = await fetch(`${this.graphUrl}/oauth/access_token?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Meta token exchange ${response.status}: ${await response.text()}`);
    }
    return (await response.json()) as MetaTokenResponse;
  }

  async exchangeForLongLivedToken(shortLivedToken: string): Promise<MetaLongLivedTokenResponse> {
    const params = new URLSearchParams({
      grant_type: "fb_exchange_token",
      client_id: this.config.app_id,
      client_secret: this.config.app_secret,
      fb_exchange_token: shortLivedToken,
    });
    const response = await fetch(`${this.graphUrl}/oauth/access_token?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Meta long-lived token ${response.status}: ${await response.text()}`);
    }
    return (await response.json()) as MetaLongLivedTokenResponse;
  }

  async listAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
    const params = new URLSearchParams({
      fields: "id,account_id,name,currency,account_status,business_name,timezone_name",
      access_token: accessToken,
      limit: "100",
    });
    const response = await fetch(`${this.graphUrl}/me/adaccounts?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Meta listAdAccounts ${response.status}: ${await response.text()}`);
    }
    const data = (await response.json()) as { data?: MetaAdAccount[] };
    return data.data ?? [];
  }

  async getDailyInsights(
    adAccountId: string,
    accessToken: string,
    sinceDate: string,
    untilDate: string
  ): Promise<MetaInsightsRow[]> {
    const normalizedId = adAccountId.startsWith("act_") ? adAccountId : `act_${adAccountId}`;
    const params = new URLSearchParams({
      fields: "spend,impressions,clicks,ctr,cpc,cpm,actions,date_start,date_stop,account_id",
      time_range: JSON.stringify({ since: sinceDate, until: untilDate }),
      time_increment: "1",
      level: "account",
      access_token: accessToken,
      limit: "500",
    });
    const response = await fetch(`${this.graphUrl}/${normalizedId}/insights?${params.toString()}`, {
      cache: "no-store",
    });
    if (!response.ok) {
      throw new Error(`Meta insights ${response.status}: ${await response.text()}`);
    }
    const data = (await response.json()) as { data?: MetaInsightsRow[] };
    return data.data ?? [];
  }
}

export function isMetaAdsConfigured(config?: MetaAdsConfig | null): boolean {
  if (!config) return false;
  if (config.is_active === false) return false;
  return Boolean(config.app_id && config.app_secret);
}

export function createMetaAdsClient(config: MetaAdsConfig): MetaAdsClient {
  return new MetaAdsClient(config);
}

export function extractLeadsFromActions(
  actions?: Array<{ action_type: string; value: string }>
): number {
  if (!actions) return 0;
  const leadTypes = new Set([
    "lead",
    "leadgen.other",
    "onsite_conversion.lead_grouped",
    "offsite_conversion.fb_pixel_lead",
  ]);
  return actions
    .filter((a) => leadTypes.has(a.action_type))
    .reduce((sum, a) => sum + Number(a.value || 0), 0);
}
