"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser, getCurrentUser } from "@/lib/services/current-user";
import { logActivity } from "@/lib/services/activity-log";
import { notifyOrgAdmins } from "@/lib/services/notifications";
import { generateOnboardingTasks } from "@/lib/services/task-generator";
import type { Proposal } from "@/types/database";

export interface ProposalInput {
  title: string;
  prospect_name: string;
  prospect_company: string;
  prospect_email: string;
  prospect_phone: string;
  introduction: string;
  problem_statement: string;
  solution_description: string;
  proposed_services: Array<{
    service_id?: string;
    name: string;
    description?: string;
    price: number;
    price_type: string;
  }>;
  case_studies: Array<{ client_name: string; result: string; testimonial?: string }>;
  has_implementation: boolean;
  implementation_fee: number | null;
  valid_until: string | null;
  special_conditions: string;
}

export async function createProposal(input: ProposalInput) {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");

  const supabase = await createServerClient();
  const admin = createAdminClient();
  const { data: numberResult } = await admin.rpc("generate_proposal_number");
  const proposalNumber = (numberResult as string) || `ADRIA-PROP-${new Date().getFullYear()}-001`;

  const monthly = input.proposed_services
    .filter((s) => s.price_type === "monthly")
    .reduce((sum, s) => sum + Number(s.price), 0);
  const oneTime = input.proposed_services
    .filter((s) => s.price_type === "one_time")
    .reduce((sum, s) => sum + Number(s.price), 0);

  const { data: proposal, error } = await supabase
    .from("proposals")
    .insert({
      organization_id: session.organizationId,
      proposal_number: proposalNumber,
      title: input.title,
      prospect_name: input.prospect_name,
      prospect_company: input.prospect_company || null,
      prospect_email: input.prospect_email || null,
      prospect_phone: input.prospect_phone.replace(/\D/g, "") || null,
      introduction: input.introduction || null,
      problem_statement: input.problem_statement || null,
      solution_description: input.solution_description || null,
      proposed_services: input.proposed_services,
      case_studies: input.case_studies,
      total_monthly: monthly,
      total_one_time: oneTime,
      has_implementation: input.has_implementation,
      implementation_fee: input.has_implementation ? input.implementation_fee : null,
      valid_until: input.valid_until,
      special_conditions: input.special_conditions || null,
      status: "draft",
      created_by: session.profile?.id,
    })
    .select()
    .single();

  if (error || !proposal) return { error: error?.message ?? "Falha ao criar" };

  revalidatePath("/proposals");
  redirect(`/proposals/${proposal.id}`);
}

export async function sendProposal(proposalId: string) {
  const supabase = await createServerClient();
  const { error } = await supabase
    .from("proposals")
    .update({ status: "sent", sent_at: new Date().toISOString() })
    .eq("id", proposalId);
  if (error) return { error: error.message };
  revalidatePath(`/proposals/${proposalId}`);
  revalidatePath("/proposals");
  return { success: true };
}

export async function markProposalViewed(token: string) {
  const supabase = createAdminClient();
  const { data: proposal } = await supabase.from("proposals").select("*").eq("public_token", token).single();
  if (!proposal) return;
  if (!proposal.viewed_at) {
    await supabase
      .from("proposals")
      .update({
        viewed_at: new Date().toISOString(),
        status: proposal.status === "sent" ? "viewed" : proposal.status,
      })
      .eq("id", proposal.id);

    await notifyOrgAdmins({
      organizationId: proposal.organization_id,
      title: "Proposta visualizada 👀",
      body: `${proposal.prospect_name} abriu a proposta ${proposal.proposal_number}`,
      link: `/proposals/${proposal.id}`,
    });
  }
}

export async function acceptProposal(token: string) {
  const supabase = createAdminClient();
  const { data: proposal } = await supabase.from("proposals").select("*").eq("public_token", token).single();
  if (!proposal) return { error: "Proposta não encontrada" };

  const now = new Date().toISOString();

  // Cria cliente
  const { data: newClient, error: clientErr } = await supabase
    .from("clients")
    .insert({
      organization_id: proposal.organization_id,
      company_name: proposal.prospect_company ?? proposal.prospect_name,
      contact_name: proposal.prospect_name,
      contact_phone: proposal.prospect_phone ?? "",
      contact_email: proposal.prospect_email,
      monthly_fee: proposal.total_monthly ?? 1500,
      status: "onboarding",
    })
    .select()
    .single();

  if (clientErr || !newClient) return { error: clientErr?.message ?? "Falha ao criar cliente" };

  await supabase.from("client_briefings").insert({ client_id: newClient.id, status: "pending" });
  await generateOnboardingTasks(newClient.id, proposal.organization_id, null);

  // Cria contrato
  const { data: numberResult } = await supabase.rpc("generate_contract_number");
  const contractNumber = (numberResult as string) || `ADRIA-${new Date().getFullYear()}-001`;
  const services = proposal.proposed_services as ProposalInput["proposed_services"];

  const { data: contract } = await supabase
    .from("contracts")
    .insert({
      client_id: newClient.id,
      organization_id: proposal.organization_id,
      contract_number: contractNumber,
      total_monthly_value: proposal.total_monthly,
      total_one_time_value: proposal.total_one_time,
      payment_method: "PIX",
      payment_due_day: 10,
      contract_months: 12,
      has_implementation: proposal.has_implementation,
      implementation_fee: proposal.implementation_fee,
      status: "sent",
      sent_at: now,
    })
    .select()
    .single();

  if (contract) {
    await supabase.from("contract_services").insert(
      services.map((s, idx) => ({
        contract_id: contract.id,
        service_name: s.name,
        service_description: s.description ?? null,
        service_category: s.price_type === "monthly" ? "recurring" : "one_time",
        price: s.price,
        price_type: s.price_type,
        quantity: 1,
        sort_order: idx,
      }))
    );
  }

  await supabase
    .from("proposals")
    .update({
      status: "converted",
      responded_at: now,
      converted_client_id: newClient.id,
      converted_contract_id: contract?.id ?? null,
    })
    .eq("id", proposal.id);

  await logActivity({
    clientId: newClient.id,
    action: "proposal_accepted",
    description: `Proposta ${proposal.proposal_number} aceita e convertida em cliente`,
    actorType: "client",
  });

  await notifyOrgAdmins({
    organizationId: proposal.organization_id,
    title: "Proposta aceita! 🎉",
    body: `${proposal.prospect_name} aceitou ${proposal.proposal_number}`,
    link: `/clients/${newClient.id}`,
  });

  return { success: true, clientId: newClient.id, clientToken: newClient.public_token };
}

export async function rejectProposal(token: string, reason: string) {
  const supabase = createAdminClient();
  const { data: proposal } = await supabase.from("proposals").select("*").eq("public_token", token).single();
  if (!proposal) return { error: "Proposta não encontrada" };

  await supabase
    .from("proposals")
    .update({
      status: "rejected",
      responded_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq("id", proposal.id);

  await notifyOrgAdmins({
    organizationId: proposal.organization_id,
    title: "Proposta recusada",
    body: `${proposal.prospect_name} recusou ${proposal.proposal_number}`,
    link: `/proposals/${proposal.id}`,
  });

  return { success: true };
}
