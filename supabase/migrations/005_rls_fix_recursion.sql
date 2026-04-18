-- =============================================================
-- Corrige recursão nas RLS policies usando helper SECURITY DEFINER
-- =============================================================

-- Função que retorna o organization_id do usuário autenticado.
-- SECURITY DEFINER faz com que ela rode como owner, ignorando RLS.
CREATE OR REPLACE FUNCTION public.current_user_org()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE SQL
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- ── Reescreve policies que dependiam de subquery recursiva em profiles ──

DROP POLICY IF EXISTS "profiles_own_or_org" ON public.profiles;
CREATE POLICY "profiles_own_or_org" ON public.profiles FOR SELECT
  USING (id = auth.uid() OR organization_id = public.current_user_org());

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE
  USING (id = auth.uid());

DROP POLICY IF EXISTS "org_members_read" ON public.organizations;
CREATE POLICY "org_members_read" ON public.organizations FOR SELECT
  USING (id = public.current_user_org());

DROP POLICY IF EXISTS "org_clients_all" ON public.clients;
CREATE POLICY "org_clients_all" ON public.clients FOR ALL
  USING (organization_id = public.current_user_org());

DROP POLICY IF EXISTS "org_briefings" ON public.client_briefings;
CREATE POLICY "org_briefings" ON public.client_briefings FOR ALL
  USING (client_id IN (SELECT id FROM public.clients WHERE organization_id = public.current_user_org()));

DROP POLICY IF EXISTS "org_tasks" ON public.tasks;
CREATE POLICY "org_tasks" ON public.tasks FOR ALL
  USING (client_id IN (SELECT id FROM public.clients WHERE organization_id = public.current_user_org()));

DROP POLICY IF EXISTS "org_reports" ON public.performance_reports;
CREATE POLICY "org_reports" ON public.performance_reports FOR ALL
  USING (client_id IN (SELECT id FROM public.clients WHERE organization_id = public.current_user_org()));

DROP POLICY IF EXISTS "org_activity" ON public.activity_log;
CREATE POLICY "org_activity" ON public.activity_log FOR ALL
  USING (client_id IN (SELECT id FROM public.clients WHERE organization_id = public.current_user_org()));

DROP POLICY IF EXISTS "org_billing" ON public.client_billing;
CREATE POLICY "org_billing" ON public.client_billing FOR ALL
  USING (client_id IN (SELECT id FROM public.clients WHERE organization_id = public.current_user_org()));

DROP POLICY IF EXISTS "org_invoices" ON public.billing_invoices;
CREATE POLICY "org_invoices" ON public.billing_invoices FOR ALL
  USING (client_id IN (SELECT id FROM public.clients WHERE organization_id = public.current_user_org()));

DROP POLICY IF EXISTS "org_billing_events" ON public.billing_events;
CREATE POLICY "org_billing_events" ON public.billing_events FOR ALL
  USING (client_id IN (SELECT id FROM public.clients WHERE organization_id = public.current_user_org()));

DROP POLICY IF EXISTS "org_assets" ON public.client_assets;
CREATE POLICY "org_assets" ON public.client_assets FOR ALL
  USING (client_id IN (SELECT id FROM public.clients WHERE organization_id = public.current_user_org()));

DROP POLICY IF EXISTS "org_health" ON public.client_health_scores;
CREATE POLICY "org_health" ON public.client_health_scores FOR ALL
  USING (client_id IN (SELECT id FROM public.clients WHERE organization_id = public.current_user_org()));

DROP POLICY IF EXISTS "org_contract_services" ON public.contract_services;
CREATE POLICY "org_contract_services" ON public.contract_services FOR ALL
  USING (contract_id IN (SELECT id FROM public.contracts WHERE organization_id = public.current_user_org()));

DROP POLICY IF EXISTS "org_contract_events" ON public.contract_events;
CREATE POLICY "org_contract_events" ON public.contract_events FOR ALL
  USING (contract_id IN (SELECT id FROM public.contracts WHERE organization_id = public.current_user_org()));

DROP POLICY IF EXISTS "org_all_catalog" ON public.service_catalog;
CREATE POLICY "org_all_catalog" ON public.service_catalog FOR ALL
  USING (organization_id = public.current_user_org());

DROP POLICY IF EXISTS "org_all_packages" ON public.service_packages;
CREATE POLICY "org_all_packages" ON public.service_packages FOR ALL
  USING (organization_id = public.current_user_org());

DROP POLICY IF EXISTS "org_all_contracts" ON public.contracts;
CREATE POLICY "org_all_contracts" ON public.contracts FOR ALL
  USING (organization_id = public.current_user_org());

DROP POLICY IF EXISTS "org_all_billing_config" ON public.billing_config;
CREATE POLICY "org_all_billing_config" ON public.billing_config FOR ALL
  USING (organization_id = public.current_user_org());

DROP POLICY IF EXISTS "org_all_task_templates" ON public.task_templates;
CREATE POLICY "org_all_task_templates" ON public.task_templates FOR ALL
  USING (organization_id = public.current_user_org());

DROP POLICY IF EXISTS "org_all_evolution" ON public.evolution_config;
CREATE POLICY "org_all_evolution" ON public.evolution_config FOR ALL
  USING (organization_id = public.current_user_org());

DROP POLICY IF EXISTS "org_all_proposals" ON public.proposals;
CREATE POLICY "org_all_proposals" ON public.proposals FOR ALL
  USING (organization_id = public.current_user_org());

DROP POLICY IF EXISTS "org_all_metrics_daily" ON public.team_metrics_daily;
CREATE POLICY "org_all_metrics_daily" ON public.team_metrics_daily FOR ALL
  USING (organization_id = public.current_user_org());

DROP POLICY IF EXISTS "org_all_metrics_monthly" ON public.team_metrics_monthly;
CREATE POLICY "org_all_metrics_monthly" ON public.team_metrics_monthly FOR ALL
  USING (organization_id = public.current_user_org());

GRANT EXECUTE ON FUNCTION public.current_user_org() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_role() TO authenticated;
