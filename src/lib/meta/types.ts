export interface MetaInsights {
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  conversions: number;
  cost_per_conversion: number;
  date_start: string;
  date_stop: string;
}

export interface MetaConfig {
  accessToken: string;
  adAccountId: string;
  apiVersion: string;
}
