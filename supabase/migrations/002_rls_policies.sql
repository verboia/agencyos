-- =============================================================
-- RLS Policies
-- =============================================================

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_briefings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contract_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_billing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evolution_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_health_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_metrics_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_assets ENABLE ROW LEVEL SECURITY;

-- Profiles: user only sees their own profile + org members
CREATE POLICY "profiles_own_or_org" ON public.profiles FOR SELECT USING (
  id = auth.uid() OR organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "profiles_self_update" ON public.profiles FOR UPDATE USING (id = auth.uid());

-- Organizations: members see their org
CREATE POLICY "org_members_read" ON public.organizations FOR SELECT USING (
  id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Clients
CREATE POLICY "org_clients_all" ON public.clients FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Client-scoped tables (briefings, tasks, reports, billing, assets, health, activity)
CREATE POLICY "org_briefings" ON public.client_briefings FOR ALL USING (
  client_id IN (SELECT id FROM public.clients WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "org_tasks" ON public.tasks FOR ALL USING (
  client_id IN (SELECT id FROM public.clients WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "org_reports" ON public.performance_reports FOR ALL USING (
  client_id IN (SELECT id FROM public.clients WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "org_activity" ON public.activity_log FOR ALL USING (
  client_id IN (SELECT id FROM public.clients WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "org_billing" ON public.client_billing FOR ALL USING (
  client_id IN (SELECT id FROM public.clients WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "org_invoices" ON public.billing_invoices FOR ALL USING (
  client_id IN (SELECT id FROM public.clients WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "org_billing_events" ON public.billing_events FOR ALL USING (
  client_id IN (SELECT id FROM public.clients WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "org_assets" ON public.client_assets FOR ALL USING (
  client_id IN (SELECT id FROM public.clients WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "org_health" ON public.client_health_scores FOR ALL USING (
  client_id IN (SELECT id FROM public.clients WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "org_contract_services" ON public.contract_services FOR ALL USING (
  contract_id IN (SELECT id FROM public.contracts WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);
CREATE POLICY "org_contract_events" ON public.contract_events FOR ALL USING (
  contract_id IN (SELECT id FROM public.contracts WHERE organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid()))
);

-- Org-scoped tables
CREATE POLICY "org_all_catalog" ON public.service_catalog FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "org_all_packages" ON public.service_packages FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "org_all_contracts" ON public.contracts FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "org_all_billing_config" ON public.billing_config FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "org_all_task_templates" ON public.task_templates FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "org_all_evolution" ON public.evolution_config FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "org_all_proposals" ON public.proposals FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "org_all_metrics_daily" ON public.team_metrics_daily FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);
CREATE POLICY "org_all_metrics_monthly" ON public.team_metrics_monthly FOR ALL USING (
  organization_id IN (SELECT organization_id FROM public.profiles WHERE id = auth.uid())
);

-- Notifications: only own
CREATE POLICY "own_notifications" ON public.notifications FOR ALL USING (user_id = auth.uid());
