-- =============================================================
-- AgencyOS — Schema inicial
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================
-- ORGANIZAÇÕES E USUÁRIOS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'operator')),
  avatar_url TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- CLIENTES
-- =============================================================

CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  contact_email TEXT,
  segment TEXT,
  plan_name TEXT DEFAULT 'Máquina de Vendas',
  monthly_fee NUMERIC(10,2) DEFAULT 1500.00,
  contract_start DATE,
  contract_months INTEGER DEFAULT 12,
  status TEXT NOT NULL DEFAULT 'onboarding'
    CHECK (status IN ('onboarding', 'active', 'paused', 'churned')),
  onboarding_progress INTEGER DEFAULT 0,
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  portal_password_hash TEXT,
  meta_ad_account_id TEXT,
  meta_access_token TEXT,
  meta_pixel_id TEXT,
  whatsapp_group_id TEXT,
  whatsapp_group_created BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES public.profiles(id)
);

-- =============================================================
-- BRIEFING
-- =============================================================

CREATE TABLE IF NOT EXISTS public.client_briefings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  business_description TEXT,
  target_audience TEXT,
  main_products_services TEXT,
  differentials TEXT,
  average_ticket NUMERIC(10,2),
  monthly_revenue_range TEXT,
  has_website BOOLEAN DEFAULT FALSE,
  website_url TEXT,
  has_instagram BOOLEAN DEFAULT FALSE,
  instagram_handle TEXT,
  has_google_business BOOLEAN DEFAULT FALSE,
  current_ads_investment NUMERIC(10,2),
  previous_agency_experience TEXT,
  main_goal TEXT,
  monthly_lead_goal INTEGER,
  monthly_revenue_goal NUMERIC(10,2),
  has_brand_guide BOOLEAN DEFAULT FALSE,
  brand_colors TEXT,
  brand_fonts TEXT,
  logo_url TEXT,
  meta_business_manager_access TEXT,
  google_ads_access TEXT,
  competitors TEXT,
  seasonal_periods TEXT,
  restrictions TEXT,
  additional_notes TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'in_progress', 'completed', 'approved')),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- CATÁLOGO DE SERVIÇOS + PACOTES
-- =============================================================

CREATE TABLE IF NOT EXISTS public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  internal_notes TEXT,
  category TEXT NOT NULL CHECK (category IN ('recurring', 'one_time', 'add_on')),
  base_price NUMERIC(10,2) NOT NULL,
  price_type TEXT NOT NULL DEFAULT 'monthly'
    CHECK (price_type IN ('monthly', 'one_time', 'per_unit')),
  contract_clauses JSONB DEFAULT '[]',
  onboarding_task_templates UUID[],
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.service_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  name TEXT NOT NULL,
  description TEXT,
  package_price NUMERIC(10,2) NOT NULL,
  included_services JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- CONTRATOS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id),
  contract_number TEXT UNIQUE NOT NULL,
  legal_name TEXT,
  document_type TEXT CHECK (document_type IN ('cpf', 'cnpj')),
  document_number TEXT,
  address_street TEXT,
  address_number TEXT,
  address_complement TEXT,
  address_neighborhood TEXT,
  address_city TEXT,
  address_state TEXT,
  address_zip TEXT,
  contractor_legal_name TEXT DEFAULT 'Adria Tecnologia e Marketing Digital',
  contractor_document TEXT,
  contractor_address TEXT,
  total_monthly_value NUMERIC(10,2),
  total_one_time_value NUMERIC(10,2),
  payment_method TEXT,
  payment_due_day INTEGER DEFAULT 10,
  contract_months INTEGER DEFAULT 12,
  start_date DATE,
  end_date DATE,
  auto_renew BOOLEAN DEFAULT TRUE,
  has_implementation BOOLEAN DEFAULT FALSE,
  implementation_fee NUMERIC(10,2),
  implementation_description TEXT,
  late_fee_percentage NUMERIC(4,2) DEFAULT 2.00,
  late_interest_monthly NUMERIC(4,2) DEFAULT 1.00,
  cancellation_fee_percentage NUMERIC(4,2) DEFAULT 20.00,
  cancellation_notice_days INTEGER DEFAULT 30,
  custom_clauses JSONB DEFAULT '[]',
  internal_notes TEXT,
  pdf_url TEXT,
  pdf_generated_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','pending_review','sent','viewed','signed','expired','cancelled')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  signed_at TIMESTAMPTZ,
  signature_ip TEXT,
  signature_user_agent TEXT,
  signature_full_name TEXT,
  signature_document_typed TEXT,
  signature_consent_text TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contract_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  service_id UUID REFERENCES public.service_catalog(id),
  service_name TEXT NOT NULL,
  service_description TEXT,
  service_category TEXT NOT NULL,
  price NUMERIC(10,2) NOT NULL,
  price_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  clauses JSONB DEFAULT '[]',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contract_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID REFERENCES public.contracts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL
    CHECK (event_type IN ('created','edited','pdf_generated','sent','viewed','signed','expired','cancelled','renewed')),
  actor_type TEXT DEFAULT 'team' CHECK (actor_type IN ('team','client','system')),
  actor_id UUID REFERENCES public.profiles(id),
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- COBRANÇA (Asaas)
-- =============================================================

CREATE TABLE IF NOT EXISTS public.billing_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) UNIQUE,
  asaas_api_key TEXT,
  asaas_environment TEXT DEFAULT 'sandbox' CHECK (asaas_environment IN ('sandbox','production')),
  asaas_wallet_id TEXT,
  company_legal_name TEXT,
  company_document TEXT,
  default_payment_method TEXT DEFAULT 'PIX' CHECK (default_payment_method IN ('PIX','BOLETO','CREDIT_CARD','UNDEFINED')),
  default_due_day INTEGER DEFAULT 10,
  default_fine_percentage NUMERIC(4,2) DEFAULT 2.00,
  default_interest_monthly NUMERIC(4,2) DEFAULT 1.00,
  default_discount_days INTEGER DEFAULT 0,
  default_discount_value NUMERIC(10,2) DEFAULT 0,
  notify_before_due_days INTEGER[] DEFAULT '{3,1}',
  notify_after_due_days INTEGER[] DEFAULT '{1,3,7,15}',
  notify_channels TEXT[] DEFAULT '{email,whatsapp}',
  pause_service_after_days INTEGER DEFAULT 15,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.client_billing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE UNIQUE,
  asaas_customer_id TEXT,
  asaas_subscription_id TEXT,
  subscription_status TEXT DEFAULT 'pending'
    CHECK (subscription_status IN ('pending','active','paused','cancelled')),
  monthly_value NUMERIC(10,2) NOT NULL,
  implementation_value NUMERIC(10,2),
  implementation_paid BOOLEAN DEFAULT FALSE,
  payment_method TEXT DEFAULT 'PIX' CHECK (payment_method IN ('PIX','BOLETO','CREDIT_CARD','UNDEFINED')),
  due_day INTEGER DEFAULT 10,
  discount_value NUMERIC(10,2) DEFAULT 0,
  discount_due_date_limit INTEGER DEFAULT 0,
  custom_fine_percentage NUMERIC(4,2),
  custom_interest_monthly NUMERIC(4,2),
  split_enabled BOOLEAN DEFAULT FALSE,
  split_wallets JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  client_billing_id UUID REFERENCES public.client_billing(id),
  asaas_payment_id TEXT UNIQUE,
  invoice_type TEXT NOT NULL CHECK (invoice_type IN ('recurring','implementation','additional','adjustment')),
  gross_value NUMERIC(10,2) NOT NULL,
  discount_value NUMERIC(10,2) DEFAULT 0,
  fine_value NUMERIC(10,2) DEFAULT 0,
  interest_value NUMERIC(10,2) DEFAULT 0,
  net_value NUMERIC(10,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','received','overdue','refunded','cancelled')),
  payment_method TEXT,
  payment_url TEXT,
  pix_qr_code TEXT,
  pix_copy_paste TEXT,
  boleto_url TEXT,
  reference_month INTEGER,
  reference_year INTEGER,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.billing_invoices(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL,
  description TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- TAREFAS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('onboarding','recurring_weekly','recurring_monthly','one_time')),
  sort_order INTEGER DEFAULT 0,
  depends_on UUID REFERENCES public.task_templates(id),
  default_assignee TEXT CHECK (default_assignee IN ('admin','operator')),
  default_due_days INTEGER,
  auto_trigger TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.task_templates(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  assigned_to UUID REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','blocked','done','cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low','medium','high','urgent')),
  due_date DATE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- RELATÓRIOS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.performance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  report_type TEXT DEFAULT 'monthly' CHECK (report_type IN ('weekly','monthly')),
  ad_spend NUMERIC(10,2),
  impressions INTEGER,
  clicks INTEGER,
  ctr NUMERIC(5,4),
  cpc NUMERIC(10,2),
  leads INTEGER,
  cpl NUMERIC(10,2),
  conversions INTEGER,
  cost_per_conversion NUMERIC(10,2),
  leads_contacted INTEGER,
  leads_qualified INTEGER,
  appointments_booked INTEGER,
  highlights TEXT,
  improvements TEXT,
  next_actions TEXT,
  ai_analysis TEXT,
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft','published','sent')),
  published_at TIMESTAMPTZ,
  sent_via_whatsapp BOOLEAN DEFAULT FALSE,
  visible_to_client BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- ACTIVITY + NOTIFICATIONS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  actor_type TEXT DEFAULT 'team' CHECK (actor_type IN ('team','client','system','ai')),
  action TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- EVOLUTION + PROPOSTAS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.evolution_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id) UNIQUE,
  instance_name TEXT NOT NULL,
  api_url TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.proposals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  client_id UUID REFERENCES public.clients(id) ON DELETE SET NULL,
  proposal_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  prospect_name TEXT NOT NULL,
  prospect_company TEXT,
  prospect_email TEXT,
  prospect_phone TEXT,
  introduction TEXT,
  problem_statement TEXT,
  solution_description TEXT,
  proposed_services JSONB NOT NULL,
  case_studies JSONB DEFAULT '[]',
  total_monthly NUMERIC(10,2),
  total_one_time NUMERIC(10,2),
  has_implementation BOOLEAN DEFAULT FALSE,
  implementation_fee NUMERIC(10,2),
  valid_until DATE,
  special_conditions TEXT,
  public_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','viewed','accepted','rejected','expired','converted')),
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  rejection_reason TEXT,
  converted_contract_id UUID REFERENCES public.contracts(id),
  converted_client_id UUID REFERENCES public.clients(id),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- HEALTH + METRICS + ASSETS
-- =============================================================

CREATE TABLE IF NOT EXISTS public.client_health_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  overall_score INTEGER NOT NULL,
  financial_score INTEGER NOT NULL,
  performance_score INTEGER NOT NULL,
  engagement_score INTEGER NOT NULL,
  task_score INTEGER NOT NULL,
  satisfaction_score INTEGER,
  score_breakdown JSONB NOT NULL,
  health_status TEXT NOT NULL CHECK (health_status IN ('healthy','attention','critical')),
  alerts JSONB DEFAULT '[]',
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  period_start DATE,
  period_end DATE
);

CREATE TABLE IF NOT EXISTS public.team_metrics_daily (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  profile_id UUID REFERENCES public.profiles(id),
  metric_date DATE NOT NULL,
  tasks_completed INTEGER DEFAULT 0,
  tasks_on_time INTEGER DEFAULT 0,
  tasks_overdue INTEGER DEFAULT 0,
  tasks_pending INTEGER DEFAULT 0,
  avg_completion_hours NUMERIC(8,2),
  clients_active INTEGER DEFAULT 0,
  clients_contacted INTEGER DEFAULT 0,
  messages_sent INTEGER DEFAULT 0,
  avg_response_time_minutes NUMERIC(8,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, metric_date)
);

CREATE TABLE IF NOT EXISTS public.team_metrics_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID REFERENCES public.organizations(id),
  profile_id UUID REFERENCES public.profiles(id),
  metric_month INTEGER NOT NULL,
  metric_year INTEGER NOT NULL,
  total_tasks_completed INTEGER DEFAULT 0,
  on_time_rate NUMERIC(5,4),
  avg_completion_hours NUMERIC(8,2),
  total_clients_managed INTEGER DEFAULT 0,
  sla_met BOOLEAN,
  sla_details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, metric_month, metric_year)
);

CREATE TABLE IF NOT EXISTS public.client_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  thumbnail_url TEXT,
  category TEXT NOT NULL CHECK (category IN ('logo','brand_guide','photo','video','creative','copy','document','other')),
  tags TEXT[],
  description TEXT,
  version INTEGER DEFAULT 1,
  parent_asset_id UUID REFERENCES public.client_assets(id),
  approval_status TEXT DEFAULT 'not_required'
    CHECK (approval_status IN ('not_required','pending','approved','rejected')),
  approved_at TIMESTAMPTZ,
  rejection_note TEXT,
  uploaded_by UUID REFERENCES public.profiles(id),
  uploaded_by_client BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================
-- INDEXES
-- =============================================================

CREATE INDEX IF NOT EXISTS idx_clients_org ON public.clients(organization_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_assigned ON public.clients(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_client ON public.tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON public.tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due ON public.tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_reports_client ON public.performance_reports(client_id);
CREATE INDEX IF NOT EXISTS idx_activity_client ON public.activity_log(client_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_contracts_client ON public.contracts(client_id);
CREATE INDEX IF NOT EXISTS idx_contracts_status ON public.contracts(status);
CREATE INDEX IF NOT EXISTS idx_service_catalog_org ON public.service_catalog(organization_id);
CREATE INDEX IF NOT EXISTS idx_client_billing_client ON public.client_billing(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_client ON public.billing_invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_status ON public.billing_invoices(status);
CREATE INDEX IF NOT EXISTS idx_billing_invoices_due ON public.billing_invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_proposals_org ON public.proposals(organization_id);
CREATE INDEX IF NOT EXISTS idx_proposals_status ON public.proposals(status);
CREATE INDEX IF NOT EXISTS idx_health_scores_client ON public.client_health_scores(client_id);
CREATE INDEX IF NOT EXISTS idx_team_metrics_daily ON public.team_metrics_daily(profile_id, metric_date);
CREATE INDEX IF NOT EXISTS idx_assets_client ON public.client_assets(client_id);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.client_assets(client_id, category);
