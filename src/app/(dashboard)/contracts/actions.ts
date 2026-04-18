"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/services/current-user";
import { logActivity } from "@/lib/services/activity-log";
import { createNotification } from "@/lib/services/notifications";
import type { ContractClause } from "@/lib/utils/contract-clauses";

interface ContractDraftInput {
  client_id: string;
  services: Array<{
    service_id: string;
    service_name: string;
    service_description: string;
    service_category: string;
    price: number;
    price_type: string;
    quantity: number;
    clauses: ContractClause[];
  }>;
  has_implementation: boolean;
  implementation_fee: number | null;
  implementation_description: string | null;
  contract_months: number;
  payment_due_day: number;
  payment_method: string;
  auto_renew: boolean;
  start_date: string | null;
  custom_clauses: ContractClause[];
  internal_notes: string | null;
  late_fee_percentage: number;
  late_interest_monthly: number;
  cancellation_fee_percentage: number;
  cancellation_notice_days: number;
  legal_name: string | null;
  document_type: "cpf" | "cnpj" | null;
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
}

function calculateTotals(input: ContractDraftInput) {
  const monthly = input.services
    .filter((s) => s.price_type === "monthly")
    .reduce((sum, s) => sum + s.price * (s.quantity || 1), 0);
  const oneTime = input.services
    .filter((s) => s.price_type === "one_time")
    .reduce((sum, s) => sum + s.price * (s.quantity || 1), 0);
  return { monthly, oneTime };
}

export async function createContract(input: ContractDraftInput) {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");

  const supabase = await createServerClient();
  const admin = createAdminClient();

  const { data: numberResult } = await admin.rpc("generate_contract_number");
  const contractNumber = (numberResult as string) || `ADRIA-${new Date().getFullYear()}-001`;

  const totals = calculateTotals(input);
  const endDate = input.start_date
    ? new Date(new Date(input.start_date).setMonth(new Date(input.start_date).getMonth() + input.contract_months))
        .toISOString()
        .slice(0, 10)
    : null;

  const { data: contract, error } = await supabase
    .from("contracts")
    .insert({
      client_id: input.client_id,
      organization_id: session.organizationId,
      contract_number: contractNumber,
      total_monthly_value: totals.monthly,
      total_one_time_value: totals.oneTime,
      payment_method: input.payment_method,
      payment_due_day: input.payment_due_day,
      contract_months: input.contract_months,
      start_date: input.start_date,
      end_date: endDate,
      auto_renew: input.auto_renew,
      has_implementation: input.has_implementation,
      implementation_fee: input.implementation_fee,
      implementation_description: input.implementation_description,
      late_fee_percentage: input.late_fee_percentage,
      late_interest_monthly: input.late_interest_monthly,
      cancellation_fee_percentage: input.cancellation_fee_percentage,
      cancellation_notice_days: input.cancellation_notice_days,
      custom_clauses: input.custom_clauses,
      internal_notes: input.internal_notes,
      legal_name: input.legal_name,
      document_type: input.document_type,
      document_number: input.document_number,
      address_street: input.address_street,
      address_number: input.address_number,
      address_complement: input.address_complement,
      address_neighborhood: input.address_neighborhood,
      address_city: input.address_city,
      address_state: input.address_state,
      address_zip: input.address_zip,
      representative_name: input.representative_name,
      representative_nationality: input.representative_nationality,
      representative_marital_status: input.representative_marital_status,
      representative_profession: input.representative_profession,
      representative_rg: input.representative_rg,
      representative_cpf: input.representative_cpf,
      representative_email: input.representative_email,
      status: "draft",
      created_by: session.profile?.id,
    })
    .select()
    .single();

  if (error || !contract) {
    return { error: error?.message ?? "Falha ao criar contrato" };
  }

  const services = input.services.map((s, idx) => ({
    contract_id: contract.id,
    service_id: s.service_id || null,
    service_name: s.service_name,
    service_description: s.service_description,
    service_category: s.service_category,
    price: s.price,
    price_type: s.price_type,
    quantity: s.quantity,
    clauses: s.clauses,
    sort_order: idx,
  }));

  await supabase.from("contract_services").insert(services);

  await supabase.from("contract_events").insert({
    contract_id: contract.id,
    event_type: "created",
    actor_type: "team",
    actor_id: session.profile?.id,
    description: `Contrato ${contractNumber} criado`,
  });

  await logActivity({
    clientId: input.client_id,
    action: "contract_created",
    description: `Contrato ${contractNumber} criado`,
    actorId: session.profile?.id,
  });

  revalidatePath(`/clients/${input.client_id}`);
  revalidatePath("/contracts");
  redirect(`/contracts/${contract.id}`);
}

export async function sendContractToClient(contractId: string) {
  const session = await requireUser();
  const supabase = await createServerClient();

  const { data: contract, error } = await supabase
    .from("contracts")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", contractId)
    .select()
    .single();

  if (error) return { error: error.message };

  await supabase.from("contract_events").insert({
    contract_id: contractId,
    event_type: "sent",
    actor_type: "team",
    actor_id: session.profile?.id,
    description: "Contrato enviado ao cliente",
  });

  await logActivity({
    clientId: contract.client_id,
    action: "contract_sent",
    description: `Contrato ${contract.contract_number} enviado ao cliente`,
    actorId: session.profile?.id,
  });

  revalidatePath(`/contracts/${contractId}`);
  revalidatePath(`/clients/${contract.client_id}`);
  return { success: true };
}

export async function cancelContract(contractId: string) {
  const session = await requireUser();
  const supabase = await createServerClient();
  const { data: contract, error } = await supabase
    .from("contracts")
    .update({ status: "cancelled" })
    .eq("id", contractId)
    .select()
    .single();
  if (error) return { error: error.message };
  await supabase.from("contract_events").insert({
    contract_id: contractId,
    event_type: "cancelled",
    actor_type: "team",
    actor_id: session.profile?.id,
    description: "Contrato cancelado",
  });
  revalidatePath(`/contracts/${contractId}`);
  revalidatePath(`/clients/${contract.client_id}`);
  return { success: true };
}
