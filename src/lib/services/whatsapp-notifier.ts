import { createAdminClient } from "@/lib/supabase/admin";
import {
  createMetaWhatsappClient,
  isMetaWhatsappConfigured,
} from "@/lib/whatsapp/meta/client";
import type { MetaWhatsappConfig } from "@/lib/whatsapp/meta/types";
import { logActivity } from "@/lib/services/activity-log";

export type WhatsappTemplateName =
  | "billing_invoice_created"
  | "billing_reminder_3d"
  | "billing_reminder_due_today"
  | "billing_overdue_1d"
  | "billing_overdue_5d"
  | "billing_overdue_10d"
  | "billing_payment_confirmed"
  | "billing_subscription_paused"
  | "contract_sent"
  | "contract_signed"
  | "proposal_sent"
  | "proposal_followup"
  | "onboarding_welcome"
  | "briefing_pending"
  | "monthly_report_published";

export interface NotifyTemplateInput {
  clientId: string;
  templateName: WhatsappTemplateName;
  bodyParams: string[];
  to?: string;
  activityAction?: string;
  activityDescription?: string;
}

export interface NotifyTemplateResult {
  sent: boolean;
  mock: boolean;
  error?: string;
  messageId?: string;
}

async function getConfig(organizationId: string): Promise<MetaWhatsappConfig | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("meta_whatsapp_config")
    .select("*")
    .eq("organization_id", organizationId)
    .maybeSingle();
  return data as MetaWhatsappConfig | null;
}

export async function notifyClientViaTemplate(
  input: NotifyTemplateInput
): Promise<NotifyTemplateResult> {
  const supabase = createAdminClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, organization_id, contact_phone, company_name")
    .eq("id", input.clientId)
    .maybeSingle();

  if (!client) return { sent: false, mock: false, error: "cliente não encontrado" };

  const to = input.to ?? client.contact_phone;
  if (!to) return { sent: false, mock: false, error: "telefone do cliente ausente" };

  const config = await getConfig(client.organization_id);

  if (!isMetaWhatsappConfigured(config)) {
    console.log(
      `[Meta WhatsApp mock] client=${client.company_name} template=${input.templateName} params=${JSON.stringify(input.bodyParams)}`
    );
    await logActivity({
      clientId: client.id,
      action: input.activityAction ?? "whatsapp_sent_mock",
      description:
        input.activityDescription ??
        `[mock] template ${input.templateName} — Meta Cloud API não configurada`,
      actorType: "system",
      metadata: { template: input.templateName, params: input.bodyParams },
    });
    return { sent: false, mock: true };
  }

  try {
    const whatsapp = createMetaWhatsappClient(config!);
    const response = await whatsapp.sendTemplate({
      to,
      templateName: input.templateName,
      bodyParams: input.bodyParams,
    });
    const messageId = response.messages?.[0]?.id;

    await logActivity({
      clientId: client.id,
      action: input.activityAction ?? "whatsapp_sent",
      description:
        input.activityDescription ??
        `WhatsApp enviado: template ${input.templateName}`,
      actorType: "system",
      metadata: { template: input.templateName, params: input.bodyParams, messageId },
    });

    return { sent: true, mock: false, messageId };
  } catch (err) {
    console.error(`Meta WhatsApp send failed (${input.templateName})`, err);
    await logActivity({
      clientId: client.id,
      action: "whatsapp_send_failed",
      description: `Falha ao enviar template ${input.templateName}: ${String(err)}`,
      actorType: "system",
      metadata: { template: input.templateName },
    });
    return { sent: false, mock: false, error: String(err) };
  }
}
