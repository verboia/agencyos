-- =============================================================
-- 007_meta_whatsapp_config.sql
-- Configuração da WhatsApp Business Cloud API oficial da Meta.
-- Substitui a integração anterior via Evolution API.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.meta_whatsapp_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE UNIQUE,
  phone_number_id TEXT NOT NULL,
  business_account_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  app_secret TEXT,
  webhook_verify_token TEXT NOT NULL,
  display_phone_number TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.meta_whatsapp_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_all_meta_whatsapp" ON public.meta_whatsapp_config;
CREATE POLICY "org_all_meta_whatsapp" ON public.meta_whatsapp_config FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
