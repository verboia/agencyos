-- =============================================================
-- Triggers e funções auxiliares
-- =============================================================

-- updated_at automático
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'clients','client_briefings','service_catalog','contracts','billing_config',
    'client_billing','billing_invoices','tasks','billing_events','proposals'
  ]
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_%s_updated_at ON public.%s', t, t);
    EXECUTE format('CREATE TRIGGER set_%s_updated_at BEFORE UPDATE ON public.%s FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()', t, t);
  END LOOP;
END $$;

-- Recalcular onboarding_progress e ativar cliente
CREATE OR REPLACE FUNCTION public.recalculate_onboarding_progress()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_client_id UUID;
  v_total INTEGER;
  v_done INTEGER;
  v_progress INTEGER;
  v_status TEXT;
BEGIN
  v_client_id := COALESCE(NEW.client_id, OLD.client_id);

  SELECT COUNT(*), COUNT(*) FILTER (WHERE status = 'done')
    INTO v_total, v_done
    FROM public.tasks
    WHERE client_id = v_client_id AND category = 'onboarding';

  IF v_total = 0 THEN
    v_progress := 0;
  ELSE
    v_progress := ROUND((v_done::NUMERIC / v_total) * 100);
  END IF;

  SELECT status INTO v_status FROM public.clients WHERE id = v_client_id;

  UPDATE public.clients
    SET onboarding_progress = v_progress,
        status = CASE
          WHEN v_progress = 100 AND v_status = 'onboarding' THEN 'active'
          ELSE status
        END,
        activated_at = CASE
          WHEN v_progress = 100 AND v_status = 'onboarding' AND activated_at IS NULL THEN NOW()
          ELSE activated_at
        END
    WHERE id = v_client_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_recalculate_onboarding ON public.tasks;
CREATE TRIGGER trg_recalculate_onboarding
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.recalculate_onboarding_progress();

-- Marcar tasks atrasadas como urgentes
CREATE OR REPLACE FUNCTION public.mark_overdue_tasks_urgent()
RETURNS void LANGUAGE sql AS $$
  UPDATE public.tasks
    SET priority = 'urgent'
    WHERE due_date < CURRENT_DATE
      AND status NOT IN ('done','cancelled')
      AND priority != 'urgent';
$$;

-- Gerar contract_number sequencial ADRIA-YYYY-NNN
CREATE OR REPLACE FUNCTION public.generate_contract_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SPLIT_PART(contract_number, '-', 3) AS INTEGER)), 0) + 1
    INTO v_seq
    FROM public.contracts
    WHERE contract_number LIKE 'ADRIA-' || v_year || '-%';
  v_number := 'ADRIA-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN v_number;
END;
$$;

-- Gerar proposal_number sequencial
CREATE OR REPLACE FUNCTION public.generate_proposal_number()
RETURNS TEXT LANGUAGE plpgsql AS $$
DECLARE
  v_year TEXT;
  v_seq INTEGER;
  v_number TEXT;
BEGIN
  v_year := TO_CHAR(NOW(), 'YYYY');
  SELECT COALESCE(MAX(CAST(SPLIT_PART(proposal_number, '-', 4) AS INTEGER)), 0) + 1
    INTO v_seq
    FROM public.proposals
    WHERE proposal_number LIKE 'ADRIA-PROP-' || v_year || '-%';
  v_number := 'ADRIA-PROP-' || v_year || '-' || LPAD(v_seq::TEXT, 3, '0');
  RETURN v_number;
END;
$$;

-- Trigger: criar profile automaticamente quando user for criado em auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, organization_id, full_name, role, email)
  VALUES (
    NEW.id,
    '00000000-0000-0000-0000-000000000001',
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'operator'),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
