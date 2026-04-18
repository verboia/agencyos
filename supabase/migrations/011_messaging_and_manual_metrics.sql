-- =============================================================
-- 011_messaging_and_manual_metrics.sql
--
-- 1. Adiciona coluna messaging_conversations em ad_metrics_daily
--    para capturar o action_type "onsite_conversion.messaging_
--    conversation_started_7d" (principal KPI de campanhas Click to
--    WhatsApp).
--
-- 2. Cria tabela client_manual_metrics para entrada diária manual
--    de leads qualificados, vendas e receita — métricas que a
--    Meta API não tem como saber.
-- =============================================================

ALTER TABLE public.ad_metrics_daily
  ADD COLUMN IF NOT EXISTS messaging_conversations BIGINT DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.client_manual_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  qualified_leads INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (client_id, date)
);

CREATE INDEX IF NOT EXISTS idx_client_manual_metrics_client_date
  ON public.client_manual_metrics (client_id, date DESC);

ALTER TABLE public.client_manual_metrics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "org_all_manual_metrics" ON public.client_manual_metrics;
CREATE POLICY "org_all_manual_metrics" ON public.client_manual_metrics FOR ALL USING (
  client_id IN (
    SELECT id FROM public.clients
    WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
  )
);
