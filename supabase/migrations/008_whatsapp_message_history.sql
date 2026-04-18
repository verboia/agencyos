-- =============================================================
-- 008_whatsapp_message_history.sql
-- Histórico de mensagens recebidas (inbound) e status de entrega
-- das mensagens enviadas via Meta WhatsApp Cloud API.
-- Populado pelo webhook /api/webhooks/meta-whatsapp.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.whatsapp_inbound_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number_id TEXT NOT NULL,
  from_phone TEXT NOT NULL,
  wa_message_id TEXT UNIQUE NOT NULL,
  message_type TEXT NOT NULL,
  body TEXT,
  received_at TIMESTAMPTZ NOT NULL,
  raw JSONB,
  handled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_from ON public.whatsapp_inbound_messages (from_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_inbound_received_at ON public.whatsapp_inbound_messages (received_at DESC);

CREATE TABLE IF NOT EXISTS public.whatsapp_message_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wa_message_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('sent','delivered','read','failed')),
  recipient_phone TEXT,
  status_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_message_status_wa_id ON public.whatsapp_message_status (wa_message_id);

ALTER TABLE public.whatsapp_inbound_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_message_status ENABLE ROW LEVEL SECURITY;

-- Webhook escreve com service role (bypass RLS). Leitura restrita ao staff da agência.
DROP POLICY IF EXISTS "staff_read_whatsapp_inbound" ON public.whatsapp_inbound_messages;
CREATE POLICY "staff_read_whatsapp_inbound" ON public.whatsapp_inbound_messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','operator'))
);

DROP POLICY IF EXISTS "staff_read_whatsapp_status" ON public.whatsapp_message_status;
CREATE POLICY "staff_read_whatsapp_status" ON public.whatsapp_message_status FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin','operator'))
);
