-- =============================================================
-- 006_contract_legal_fields.sql
-- Adiciona dados do representante legal da CONTRATANTE
-- e prepara o bucket de armazenamento de PDFs de contrato.
-- =============================================================

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS representative_name TEXT,
  ADD COLUMN IF NOT EXISTS representative_nationality TEXT,
  ADD COLUMN IF NOT EXISTS representative_marital_status TEXT,
  ADD COLUMN IF NOT EXISTS representative_profession TEXT,
  ADD COLUMN IF NOT EXISTS representative_rg TEXT,
  ADD COLUMN IF NOT EXISTS representative_cpf TEXT,
  ADD COLUMN IF NOT EXISTS representative_email TEXT;

-- Bucket público para PDFs dos contratos gerados.
INSERT INTO storage.buckets (id, name, public)
VALUES ('contracts', 'contracts', true)
ON CONFLICT (id) DO NOTHING;

-- Acesso público de leitura para que o link do PDF funcione direto.
DROP POLICY IF EXISTS "Public read contracts PDFs" ON storage.objects;
CREATE POLICY "Public read contracts PDFs" ON storage.objects
  FOR SELECT USING (bucket_id = 'contracts');

-- Service role já ignora RLS; política explícita para uploads
-- via server actions/API routes autenticadas.
DROP POLICY IF EXISTS "Authenticated upload contracts PDFs" ON storage.objects;
CREATE POLICY "Authenticated upload contracts PDFs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'contracts' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated update contracts PDFs" ON storage.objects;
CREATE POLICY "Authenticated update contracts PDFs" ON storage.objects
  FOR UPDATE USING (bucket_id = 'contracts' AND auth.role() = 'authenticated');
