export interface MetaAdsConfig {
  app_id: string;
  app_secret: string;
  api_version?: string | null;
  is_active?: boolean | null;
}

export interface MetaAdAccount {
  id: string;
  account_id: string;
  name: string;
  currency: string;
  account_status: number;
  business_name?: string;
  timezone_name?: string;
}

export interface MetaInsightsRow {
  date_start: string;
  date_stop: string;
  account_id: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  actions?: Array<{ action_type: string; value: string }>;
}

export interface MetaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}

export interface MetaLongLivedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
}
