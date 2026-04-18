"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientByToken } from "@/lib/services/portal-auth";
import { logActivity } from "@/lib/services/activity-log";
import { notifyOrgAdmins } from "@/lib/services/notifications";
import { setupBillingOnContractSigned } from "@/lib/services/billing-setup";
import { notifyClientViaTemplate } from "@/lib/services/whatsapp-notifier";
import { APP_URL } from "@/lib/utils/constants";

export async function markContractViewed(token: string, contractId: string) {
  const client = await getClientByToken(token);
  if (!client) return;
  const supabase = createAdminClient();
  const { data: contract } = await supabase
    .from("contracts")
    .select("status, viewed_at")
    .eq("id", contractId)
    .single();
  if (contract && !contract.viewed_at) {
    await supabase
      .from("contracts")
      .update({ viewed_at: new Date().toISOString(), status: contract.status === "sent" ? "viewed" : contract.status })
      .eq("id", contractId);
    await supabase.from("contract_events").insert({
      contract_id: contractId,
      event_type: "viewed",
      actor_type: "client",
      description: "Cliente visualizou o contrato",
    });
  }
}

export async function acceptContract(
  token: string,
  contractId: string,
  data: {
    legal_name: string;
    document_type: "cpf" | "cnpj";
    document_number: string;
    address_street: string;
    address_number: string;
    address_complement?: string;
    address_neighborhood: string;
    address_city: string;
    address_state: string;
    address_zip: string;
    signature_full_name: string;
    signature_document_typed: string;
  }
) {
  const client = await getClientByToken(token);
  if (!client) return { error: "Cliente não encontrado" };

  const headersList = headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0] ?? headersList.get("x-real-ip") ?? "unknown";
  const userAgent = headersList.get("user-agent") ?? "unknown";

  const supabase = createAdminClient();
  const now = new Date().toISOString();
  const consentText =
    "Li e concordo com todos os termos deste contrato. Este aceite tem validade jurídica conforme Art. 107 do Código Civil e MP 2.200-2/2001.";

  const { data: contract, error } = await supabase
    .from("contracts")
    .update({
      legal_name: data.legal_name,
      document_type: data.document_type,
      document_number: data.document_number.replace(/\D/g, ""),
      address_street: data.address_street,
      address_number: data.address_number,
      address_complement: data.address_complement || null,
      address_neighborhood: data.address_neighborhood,
      address_city: data.address_city,
      address_state: data.address_state,
      address_zip: data.address_zip.replace(/\D/g, ""),
      signature_full_name: data.signature_full_name,
      signature_document_typed: data.signature_document_typed,
      signature_ip: ip,
      signature_user_agent: userAgent,
      signature_consent_text: consentText,
      signed_at: now,
      status: "signed",
    })
    .eq("id", contractId)
    .select()
    .single();

  if (error || !contract) return { error: error?.message ?? "Falha no aceite" };

  await supabase.from("contract_events").insert({
    contract_id: contractId,
    event_type: "signed",
    actor_type: "client",
    description: `Contrato assinado digitalmente por ${data.signature_full_name}`,
    metadata: { ip, userAgent },
  });

  await logActivity({
    clientId: client.id,
    action: "contract_signed",
    description: `${data.signature_full_name} assinou o contrato ${contract.contract_number}`,
    actorType: "client",
  });

  // Marcar tarefa de assinatura como done
  await supabase
    .from("tasks")
    .update({ status: "done", completed_at: now })
    .eq("client_id", client.id)
    .ilike("title", "%assinar contrato%");

  await notifyOrgAdmins({
    organizationId: client.organization_id,
    title: "Contrato assinado! ✅",
    body: `${client.company_name} assinou o contrato ${contract.contract_number}.`,
    link: `/contracts/${contractId}`,
  });

  // Setup de billing (Asaas) — mockado se API key não configurada
  await setupBillingOnContractSigned(contractId, client.id);

  // Notificações via Meta WhatsApp — mock se não configurado
  const contactFirstName = (client.contact_name ?? client.company_name).trim().split(/\s+/)[0];
  await notifyClientViaTemplate({
    clientId: client.id,
    templateName: "contract_signed",
    bodyParams: [contract.contract_number, contactFirstName],
    activityAction: "contract_signed_notified",
  });
  await notifyClientViaTemplate({
    clientId: client.id,
    templateName: "onboarding_welcome",
    bodyParams: [contactFirstName, `${APP_URL}/portal/${token}/briefing`],
    activityAction: "onboarding_welcome_sent",
  });

  revalidatePath(`/portal/${token}`);
  revalidatePath(`/portal/${token}/contract`);
  revalidatePath(`/clients/${client.id}`);
  return { success: true };
}
