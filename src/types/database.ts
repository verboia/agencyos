export type UserRole = "admin" | "operator";
export type ClientStatus = "onboarding" | "active" | "paused" | "churned";
export type TaskStatus = "pending" | "in_progress" | "blocked" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type TaskCategory = "onboarding" | "recurring_weekly" | "recurring_monthly" | "one_time";
export type ContractStatus =
  | "draft"
  | "pending_review"
  | "sent"
  | "viewed"
  | "signed"
  | "expired"
  | "cancelled";
export type ProposalStatus =
  | "draft"
  | "sent"
  | "viewed"
  | "accepted"
  | "rejected"
  | "expired"
  | "converted";
export type InvoiceStatus =
  | "pending"
  | "confirmed"
  | "received"
  | "overdue"
  | "refunded"
  | "cancelled";
export type SubscriptionStatus = "pending" | "active" | "paused" | "cancelled";
export type PaymentMethod = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";
export type DocumentType = "cpf" | "cnpj";
export type InvoiceType = "recurring" | "implementation" | "additional" | "adjustment";
export type ServiceCategory = "recurring" | "one_time" | "add_on";
export type PriceType = "monthly" | "one_time" | "per_unit";
export type BriefingStatus = "pending" | "in_progress" | "completed" | "approved";
export type ReportType = "weekly" | "monthly";
export type ReportStatus = "draft" | "published" | "sent";
export type AssetCategory =
  | "logo"
  | "brand_guide"
  | "photo"
  | "video"
  | "creative"
  | "copy"
  | "document"
  | "other";
export type ApprovalStatus = "not_required" | "pending" | "approved" | "rejected";
export type HealthStatus = "healthy" | "attention" | "critical";

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  email?: string;
  created_at: string;
}

export interface Client {
  id: string;
  organization_id: string;
  company_name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string | null;
  segment: string | null;
  plan_name: string;
  monthly_fee: number;
  contract_start: string | null;
  contract_months: number;
  status: ClientStatus;
  onboarding_progress: number;
  public_token: string;
  portal_password_hash: string | null;
  meta_ad_account_id: string | null;
  meta_access_token: string | null;
  meta_pixel_id: string | null;
  whatsapp_group_id: string | null;
  whatsapp_group_created: boolean;
  created_at: string;
  updated_at: string;
  activated_at: string | null;
  assigned_to: string | null;
}

export interface ClientBriefing {
  id: string;
  client_id: string;
  business_description: string | null;
  target_audience: string | null;
  main_products_services: string | null;
  differentials: string | null;
  average_ticket: number | null;
  monthly_revenue_range: string | null;
  has_website: boolean;
  website_url: string | null;
  has_instagram: boolean;
  instagram_handle: string | null;
  has_google_business: boolean;
  current_ads_investment: number | null;
  previous_agency_experience: string | null;
  main_goal: string | null;
  monthly_lead_goal: number | null;
  monthly_revenue_goal: number | null;
  has_brand_guide: boolean;
  brand_colors: string | null;
  brand_fonts: string | null;
  logo_url: string | null;
  meta_business_manager_access: string | null;
  google_ads_access: string | null;
  competitors: string | null;
  seasonal_periods: string | null;
  restrictions: string | null;
  additional_notes: string | null;
  status: BriefingStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ServiceCatalog {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description: string | null;
  internal_notes: string | null;
  category: ServiceCategory;
  base_price: number;
  price_type: PriceType;
  contract_clauses: Array<{ title: string; body: string; order: number }>;
  onboarding_task_templates: string[] | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface ServicePackage {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  package_price: number;
  included_services: Array<{ service_id: string; custom_price: number | null }>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface Contract {
  id: string;
  client_id: string;
  organization_id: string;
  contract_number: string;
  legal_name: string | null;
  document_type: DocumentType | null;
  document_number: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_zip: string | null;
  representative_name: string | null;
  representative_nationality: string | null;
  representative_marital_status: string | null;
  representative_profession: string | null;
  representative_rg: string | null;
  representative_cpf: string | null;
  representative_email: string | null;
  contractor_legal_name: string;
  contractor_document: string | null;
  contractor_address: string | null;
  total_monthly_value: number | null;
  total_one_time_value: number | null;
  payment_method: string | null;
  payment_due_day: number;
  contract_months: number;
  start_date: string | null;
  end_date: string | null;
  auto_renew: boolean;
  has_implementation: boolean;
  implementation_fee: number | null;
  implementation_description: string | null;
  late_fee_percentage: number;
  late_interest_monthly: number;
  cancellation_fee_percentage: number;
  cancellation_notice_days: number;
  custom_clauses: Array<{ title: string; body: string; order: number }>;
  internal_notes: string | null;
  pdf_url: string | null;
  pdf_generated_at: string | null;
  status: ContractStatus;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  signature_ip: string | null;
  signature_user_agent: string | null;
  signature_full_name: string | null;
  signature_document_typed: string | null;
  signature_consent_text: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContractService {
  id: string;
  contract_id: string;
  service_id: string | null;
  service_name: string;
  service_description: string | null;
  service_category: ServiceCategory;
  price: number;
  price_type: PriceType;
  quantity: number;
  clauses: Array<{ title: string; body: string; order: number }>;
  sort_order: number;
  created_at: string;
}

export interface TaskTemplate {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  category: TaskCategory;
  sort_order: number;
  depends_on: string | null;
  default_assignee: UserRole | null;
  default_due_days: number | null;
  auto_trigger: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Task {
  id: string;
  client_id: string;
  template_id: string | null;
  title: string;
  description: string | null;
  category: TaskCategory;
  assigned_to: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  notes: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PerformanceReport {
  id: string;
  client_id: string;
  period_start: string;
  period_end: string;
  report_type: ReportType;
  ad_spend: number | null;
  impressions: number | null;
  clicks: number | null;
  ctr: number | null;
  cpc: number | null;
  leads: number | null;
  cpl: number | null;
  conversions: number | null;
  cost_per_conversion: number | null;
  leads_contacted: number | null;
  leads_qualified: number | null;
  appointments_booked: number | null;
  highlights: string | null;
  improvements: string | null;
  next_actions: string | null;
  ai_analysis: string | null;
  status: ReportStatus;
  published_at: string | null;
  sent_via_whatsapp: boolean;
  visible_to_client: boolean;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  client_id: string;
  actor_id: string | null;
  actor_type: "team" | "client" | "system" | "ai";
  action: string;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  read: boolean;
  created_at: string;
}

export interface BillingConfig {
  id: string;
  organization_id: string;
  asaas_api_key: string;
  asaas_environment: "sandbox" | "production";
  asaas_wallet_id: string | null;
  company_legal_name: string | null;
  company_document: string | null;
  default_payment_method: PaymentMethod;
  default_due_day: number;
  default_fine_percentage: number;
  default_interest_monthly: number;
  default_discount_days: number;
  default_discount_value: number;
  notify_before_due_days: number[];
  notify_after_due_days: number[];
  notify_channels: string[];
  pause_service_after_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientBilling {
  id: string;
  client_id: string;
  asaas_customer_id: string | null;
  asaas_subscription_id: string | null;
  subscription_status: SubscriptionStatus;
  monthly_value: number;
  implementation_value: number | null;
  implementation_paid: boolean;
  payment_method: PaymentMethod;
  due_day: number;
  discount_value: number;
  discount_due_date_limit: number;
  custom_fine_percentage: number | null;
  custom_interest_monthly: number | null;
  split_enabled: boolean;
  split_wallets: Array<{ wallet_id: string; percentage: number }> | null;
  created_at: string;
  updated_at: string;
}

export interface BillingInvoice {
  id: string;
  client_id: string;
  client_billing_id: string | null;
  asaas_payment_id: string | null;
  invoice_type: InvoiceType;
  gross_value: number;
  discount_value: number;
  fine_value: number;
  interest_value: number;
  net_value: number;
  due_date: string;
  paid_at: string | null;
  status: InvoiceStatus;
  payment_method: string | null;
  payment_url: string | null;
  pix_qr_code: string | null;
  pix_copy_paste: string | null;
  boleto_url: string | null;
  reference_month: number | null;
  reference_year: number | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Proposal {
  id: string;
  organization_id: string;
  client_id: string | null;
  proposal_number: string;
  title: string;
  prospect_name: string;
  prospect_company: string | null;
  prospect_email: string | null;
  prospect_phone: string | null;
  introduction: string | null;
  problem_statement: string | null;
  solution_description: string | null;
  proposed_services: Array<{
    service_id?: string;
    name: string;
    description?: string;
    price: number;
    price_type: PriceType;
  }>;
  case_studies: Array<{ client_name: string; result: string; testimonial?: string }>;
  total_monthly: number | null;
  total_one_time: number | null;
  has_implementation: boolean;
  implementation_fee: number | null;
  valid_until: string | null;
  special_conditions: string | null;
  public_token: string;
  status: ProposalStatus;
  sent_at: string | null;
  viewed_at: string | null;
  responded_at: string | null;
  rejection_reason: string | null;
  converted_contract_id: string | null;
  converted_client_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientHealthScore {
  id: string;
  client_id: string;
  overall_score: number;
  financial_score: number;
  performance_score: number;
  engagement_score: number;
  task_score: number;
  satisfaction_score: number | null;
  score_breakdown: Record<string, unknown>;
  health_status: HealthStatus;
  alerts: Array<{ type: string; message: string; severity: string }>;
  calculated_at: string;
  period_start: string | null;
  period_end: string | null;
}

export interface TeamMetricsDaily {
  id: string;
  organization_id: string;
  profile_id: string;
  metric_date: string;
  tasks_completed: number;
  tasks_on_time: number;
  tasks_overdue: number;
  tasks_pending: number;
  avg_completion_hours: number | null;
  clients_active: number;
  clients_contacted: number;
  messages_sent: number;
  avg_response_time_minutes: number | null;
  created_at: string;
}

export interface ClientAsset {
  id: string;
  client_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  file_type: string | null;
  thumbnail_url: string | null;
  category: AssetCategory;
  tags: string[] | null;
  description: string | null;
  version: number;
  parent_asset_id: string | null;
  approval_status: ApprovalStatus;
  approved_at: string | null;
  rejection_note: string | null;
  uploaded_by: string | null;
  uploaded_by_client: boolean;
  created_at: string;
}
