import type { MetaConfig, MetaInsights } from "./types";

export class MetaClient {
  constructor(private readonly config: MetaConfig) {}

  private get baseUrl() {
    return `https://graph.facebook.com/${this.config.apiVersion}`;
  }

  async getInsights(since: string, until: string): Promise<MetaInsights | null> {
    const fields = [
      "spend",
      "impressions",
      "clicks",
      "ctr",
      "cpc",
      "actions",
      "cost_per_action_type",
    ].join(",");

    const url = new URL(`${this.baseUrl}/${this.config.adAccountId}/insights`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("time_range", JSON.stringify({ since, until }));
    url.searchParams.set("access_token", this.config.accessToken);

    const response = await fetch(url.toString(), { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Meta insights ${response.status}`);
    }
    const json = await response.json();
    const row = json?.data?.[0];
    if (!row) return null;

    const actions = (row.actions as Array<{ action_type: string; value: string }>) ?? [];
    const leadAction = actions.find((a) => a.action_type === "lead" || a.action_type === "onsite_conversion.lead_grouped");
    const leads = leadAction ? Number(leadAction.value) : 0;

    const costPerLead = leads > 0 ? Number(row.spend) / leads : 0;

    return {
      spend: Number(row.spend ?? 0),
      impressions: Number(row.impressions ?? 0),
      clicks: Number(row.clicks ?? 0),
      ctr: Number(row.ctr ?? 0) / 100,
      cpc: Number(row.cpc ?? 0),
      conversions: leads,
      cost_per_conversion: costPerLead,
      date_start: row.date_start,
      date_stop: row.date_stop,
    };
  }
}

export interface MetaClientCredentials {
  ad_account_id?: string | null;
  access_token?: string | null;
}

export function isMetaConfigured(client: MetaClientCredentials | null | undefined): boolean {
  return Boolean(client?.access_token && client?.ad_account_id);
}

export function createMetaClient(credentials: MetaClientCredentials): MetaClient {
  if (!credentials.access_token || !credentials.ad_account_id) {
    throw new Error("Meta credentials ausentes");
  }
  return new MetaClient({
    accessToken: credentials.access_token,
    adAccountId: credentials.ad_account_id,
    apiVersion: "v21.0",
  });
}

export function mockInsights(): MetaInsights {
  return {
    spend: 1200,
    impressions: 45000,
    clicks: 820,
    ctr: 0.018,
    cpc: 1.46,
    conversions: 48,
    cost_per_conversion: 25,
    date_start: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    date_stop: new Date().toISOString().slice(0, 10),
  };
}
