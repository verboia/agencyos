-- =============================================================
-- 009_ad_integrations.sql
-- Integrações com plataformas de anúncios (Meta, Google, TikTok):
--   * ad_platform_configs  → credenciais do APP da agência (1x por plataforma)
--   * ad_integrations      → tokens OAuth dos clientes (1 por cliente × plataforma × conta)
--   * ad_metrics_daily     → snapshot diário das métricas coletadas via API
-- =============================================================

CREATE TYPE ad_platform AS ENUM ('meta', 'google', 'tiktok');

CREATE TYPE ad_integration_status AS ENUM ('connected', 'expired', 'revoked', 'error', 'disconnected');

-- Credenciais do App da agência (o que é registrado no developer portal de cada plataforma)
CREATE TABLE IF NOT EXISTS public.ad_platform_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform ad_platform NOT NULL,
  app_id TEXT,
  app_secret TEXT,
  api_version TEXT,
  developer_token TEXT,       -- Google Ads
  manager_account_id TEXT,    -- Google MCC
  business_center_id TEXT,    -- TikTok Business Center
  default_scopes TEXT[],
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (organization_id, platform)
);

-- Tokens OAuth de cada cliente, vinculados a uma conta de anúncios específica
CREATE TABLE IF NOT EXISTS public.ad_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform ad_platform NOT NULL,
  external_account_id TEXT NOT NULL,
  external_account_name TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  granted_scopes TEXT[],
  status ad_integration_status NOT NULL DEFAULT 'connected',
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  last_sync_at TIMESTAMPTZ,
  last_sync_error TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, platform, external_account_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_integrations_client ON public.ad_integrations (client_id);
CREATE INDEX IF NOT EXISTS idx_ad_integrations_platform_status ON public.ad_integrations (platform, status);

-- Snapshot diário das métricas por conta de anúncios
CREATE TABLE IF NOT EXISTS public.ad_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  integration_id UUID REFERENCES public.ad_integrations(id) ON DELETE CASCADE,
  platform ad_platform NOT NULL,
  external_account_id TEXT NOT NULL,
  date DATE NOT NULL,
  spend NUMERIC(12,2) DEFAULT 0,
  impressions BIGINT DEFAULT 0,
  clicks BIGINT DEFAULT 0,
  leads BIGINT DEFAULT 0,
  conversions BIGINT DEFAULT 0,
  ctr NUMERIC(6,4),
  cpc NUMERIC(10,2),
  cpm NUMERIC(10,2),
  cpl NUMERIC(10,2),
  raw JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (integration_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ad_metrics_client_date ON public.ad_metrics_daily (client_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_metrics_platform_date ON public.ad_metrics_daily (platform, date DESC);

-- Nonce/state do OAuth (curto prazo, para validar callback)
CREATE TABLE IF NOT EXISTS public.ad_oauth_states (
  state TEXT PRIMARY KEY,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform ad_platform NOT NULL,
  redirect_after TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ad_oauth_states_expires ON public.ad_oauth_states (expires_at);

ALTER TABLE public.ad_platform_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_oauth_states ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_all_ad_platform_configs" ON public.ad_platform_configs;
CREATE POLICY "org_all_ad_platform_configs" ON public.ad_platform_configs FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "org_all_ad_integrations" ON public.ad_integrations;
CREATE POLICY "org_all_ad_integrations" ON public.ad_integrations FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "org_all_ad_metrics" ON public.ad_metrics_daily;
CREATE POLICY "org_all_ad_metrics" ON public.ad_metrics_daily FOR ALL USING (
  client_id IN (
    SELECT id FROM public.clients
    WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
);

-- ad_oauth_states é escrita/lida pelo service role (API routes); sem política pública.
