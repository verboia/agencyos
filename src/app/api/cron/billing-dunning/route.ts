export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/services/activity-log";
import { notifyOrgAdmins } from "@/lib/services/notifications";
import {
  notifyClientViaTemplate,
  type WhatsappTemplateName,
} from "@/lib/services/whatsapp-notifier";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { APP_URL } from "@/lib/utils/constants";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${secret}`;
}

// Cada chave = dias até o vencimento. Positivo = futuro, 0 = hoje, negativo = atrasado.
const DUNNING_TEMPLATES: Record<number, WhatsappTemplateName> = {
  3: "billing_reminder_3d",
  0: "billing_reminder_due_today",
  [-1]: "billing_overdue_1d",
  [-5]: "billing_overdue_5d",
  [-10]: "billing_overdue_10d",
};

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);

  // 1. Marca faturas vencidas como overdue
  await supabase
    .from("billing_invoices")
    .update({ status: "overdue" })
    .lt("due_date", todayStr)
    .eq("status", "pending");

  const { data: config } = await supabase.from("billing_config").select("*").limit(1).maybeSingle();
  const pauseDays = config?.pause_service_after_days ?? 15;

  // 2. Busca todas as faturas ativas (pending + overdue)
  const { data: invoices } = await supabase
    .from("billing_invoices")
    .select(
      "id, client_id, due_date, gross_value, asaas_payment_id, client:clients(id, company_name, contact_name, organization_id, status, public_token)"
    )
    .in("status", ["pending", "overdue"]);

  let notified = 0;
  let paused = 0;

  for (const inv of invoices ?? []) {
    const client = Array.isArray(inv.client) ? inv.client[0] : inv.client;
    if (!client) continue;

    const dueDate = new Date(inv.due_date);
    dueDate.setHours(0, 0, 0, 0);
    const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Régua de templates
    const template = DUNNING_TEMPLATES[daysUntilDue];
    if (template && !(await alreadyNotifiedToday(inv.id, template, todayStr))) {
      await notifyClientViaTemplate({
        clientId: client.id,
        templateName: template,
        bodyParams: buildParams(template, {
          firstName: firstName(client.contact_name ?? client.company_name),
          invoiceRef: String(inv.id).slice(0, 8).toUpperCase(),
          amount: formatCurrency(Number(inv.gross_value)),
          dueDate: formatDate(inv.due_date),
          portalLink: `${APP_URL}/portal/${client.public_token}/billing`,
          pauseDate: formatDate(addDays(new Date(inv.due_date), pauseDays)),
        }),
        activityAction: `dunning_${template}`,
        activityDescription: `Régua de cobrança: ${template}`,
      });

      await supabase.from("billing_events").insert({
        client_id: client.id,
        invoice_id: inv.id,
        event_type: `dunning_${template}`,
        description: `Disparo automático de ${template}`,
      });

      notified++;
    }

    // Pausa de serviço
    const daysOverdue = -daysUntilDue;
    if (daysOverdue >= pauseDays && client.status === "active") {
      await supabase.from("clients").update({ status: "paused" }).eq("id", client.id);

      await notifyClientViaTemplate({
        clientId: client.id,
        templateName: "billing_subscription_paused",
        bodyParams: [
          firstName(client.contact_name ?? client.company_name),
          String(inv.id).slice(0, 8).toUpperCase(),
          `${APP_URL}/portal/${client.public_token}/billing`,
        ],
        activityAction: "subscription_paused_notified",
      });

      await notifyOrgAdmins({
        organizationId: client.organization_id,
        title: "Cliente pausado por inadimplência",
        body: `${client.company_name} foi pausado automaticamente (${daysOverdue} dias de atraso).`,
        link: `/clients/${client.id}/billing`,
      });

      await logActivity({
        clientId: client.id,
        action: "service_paused",
        description: `Serviço pausado automaticamente (${daysOverdue} dias de atraso)`,
        actorType: "system",
      });
      paused++;
    }
  }

  return NextResponse.json({ processed: invoices?.length ?? 0, notified, paused });
}

async function alreadyNotifiedToday(
  invoiceId: string,
  template: WhatsappTemplateName,
  todayStr: string
): Promise<boolean> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("billing_events")
    .select("id")
    .eq("invoice_id", invoiceId)
    .eq("event_type", `dunning_${template}`)
    .gte("created_at", `${todayStr}T00:00:00Z`)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

function buildParams(
  template: WhatsappTemplateName,
  ctx: {
    firstName: string;
    invoiceRef: string;
    amount: string;
    dueDate: string;
    portalLink: string;
    pauseDate: string;
  }
): string[] {
  switch (template) {
    case "billing_reminder_3d":
      return [ctx.firstName, ctx.amount, ctx.dueDate, ctx.portalLink];
    case "billing_reminder_due_today":
      return [ctx.firstName, ctx.amount, ctx.portalLink];
    case "billing_overdue_1d":
      return [ctx.firstName, ctx.invoiceRef, ctx.amount, ctx.portalLink];
    case "billing_overdue_5d":
      return [ctx.firstName, ctx.invoiceRef, ctx.amount, ctx.portalLink];
    case "billing_overdue_10d":
      return [ctx.firstName, ctx.invoiceRef, ctx.amount, ctx.pauseDate, ctx.portalLink];
    default:
      return [];
  }
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
