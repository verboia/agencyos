-- =============================================================
-- 012_wapi_groups.sql
-- Integração W-API (https://w-api.app) — substitui Evolution API.
-- Permite vincular múltiplos grupos do WhatsApp a clientes para
-- envio automatizado de relatórios e alertas de saldo Meta Ads.
-- =============================================================

-- Credenciais da instância W-API por organização
CREATE TABLE IF NOT EXISTS public.wapi_config (
  organization_id UUID PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  instance_id TEXT NOT NULL,
  token TEXT NOT NULL,
  display_phone_number TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  last_groups_sync_at TIMESTAMPTZ,
  last_groups_sync_count INT,
  last_groups_sync_error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cache local dos grupos descobertos via get-all-groups
CREATE TABLE IF NOT EXISTS public.wapi_groups_cache (
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  subject TEXT,
  participants_count INT,
  is_admin BOOLEAN,
  raw JSONB,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (organization_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_wapi_groups_cache_org ON public.wapi_groups_cache (organization_id);

-- Vínculo cliente <-> grupo (multi-para-multi com configurações de envio)
CREATE TABLE IF NOT EXISTS public.client_whatsapp_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  group_id TEXT NOT NULL,
  group_subject TEXT,
  purpose TEXT NOT NULL DEFAULT 'reports', -- 'reports' | 'internal' | 'general'
  send_weekly_report BOOLEAN DEFAULT TRUE,
  send_daily_report BOOLEAN DEFAULT FALSE,
  send_monthly_report BOOLEAN DEFAULT TRUE,
  send_balance_alerts BOOLEAN DEFAULT TRUE,
  low_balance_threshold NUMERIC(10,2) DEFAULT 100,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, group_id)
);

CREATE INDEX IF NOT EXISTS idx_cwg_client ON public.client_whatsapp_groups (client_id);
CREATE INDEX IF NOT EXISTS idx_cwg_org ON public.client_whatsapp_groups (organization_id);
CREATE INDEX IF NOT EXISTS idx_cwg_balance_alerts
  ON public.client_whatsapp_groups (organization_id)
  WHERE send_balance_alerts = TRUE AND is_active = TRUE;

-- Histórico de envios
CREATE TABLE IF NOT EXISTS public.whatsapp_send_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  group_id TEXT NOT NULL,
  category TEXT NOT NULL, -- 'weekly_report' | 'daily_report' | 'monthly_report' | 'balance_alert' | 'manual'
  message TEXT,
  status TEXT NOT NULL,   -- 'sent' | 'failed' | 'mock'
  external_message_id TEXT,
  error_message TEXT,
  metadata JSONB,
  sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wsl_client_date ON public.whatsapp_send_logs (client_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_wsl_category_date ON public.whatsapp_send_logs (category, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_wsl_org_date ON public.whatsapp_send_logs (organization_id, sent_at DESC);

ALTER TABLE public.wapi_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wapi_groups_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_whatsapp_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_send_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_all_wapi_config" ON public.wapi_config;
CREATE POLICY "org_all_wapi_config" ON public.wapi_config FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "org_all_wapi_groups_cache" ON public.wapi_groups_cache;
CREATE POLICY "org_all_wapi_groups_cache" ON public.wapi_groups_cache FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "org_all_client_whatsapp_groups" ON public.client_whatsapp_groups;
CREATE POLICY "org_all_client_whatsapp_groups" ON public.client_whatsapp_groups FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "org_all_whatsapp_send_logs" ON public.whatsapp_send_logs;
CREATE POLICY "org_all_whatsapp_send_logs" ON public.whatsapp_send_logs FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Limpeza: evolution_config fica órfã mas é mantida pra não quebrar histórico.
-- Será removida em migration futura após validação.
