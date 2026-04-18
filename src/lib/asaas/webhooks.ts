import { createAdminClient } from "@/lib/supabase/admin";
import { notifyOrgAdmins } from "@/lib/services/notifications";
import { logActivity } from "@/lib/services/activity-log";
import { notifyClientViaTemplate } from "@/lib/services/whatsapp-notifier";
import { createAsaasClient, isAsaasConfigured } from "./client";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { APP_URL } from "@/lib/utils/constants";
import type { AsaasWebhookEvent, AsaasPayment } from "./types";

export async function processAsaasWebhook(event: AsaasWebhookEvent) {
  const supabase = createAdminClient();
  const payment = event.payment;

  if (!payment) {
    await supabase.from("billing_events").insert({
      event_type: `asaas_${event.event.toLowerCase()}`,
      description: event.event,
      metadata: event as unknown as Record<string, unknown>,
    });
    return;
  }

  let { data: invoice } = await supabase
    .from("billing_invoices")
    .select("*")
    .eq("asaas_payment_id", payment.id)
    .maybeSingle();

  // Se ainda não existe invoice local para esse payment (caso típico da subscription recorrente),
  // tenta criar vinculando ao cliente pelo asaas_customer_id.
  if (!invoice) {
    const { data: clientBilling } = await supabase
      .from("client_billing")
      .select("client_id, id")
      .eq("asaas_customer_id", payment.customer)
      .maybeSingle();

    if (clientBilling) {
      const { data: inserted } = await supabase
        .from("billing_invoices")
        .insert({
          client_id: clientBilling.client_id,
          client_billing_id: clientBilling.id,
          asaas_payment_id: payment.id,
          invoice_type: "recurring",
          gross_value: payment.value,
          net_value: payment.netValue ?? payment.value,
          due_date: payment.dueDate,
          status: mapStatus(event.event, "pending"),
          payment_method: payment.billingType,
          payment_url: payment.invoiceUrl,
          boleto_url: payment.bankSlipUrl,
          description: payment.description,
        })
        .select("*")
        .single();
      invoice = inserted;
    }
  }

  const newStatus = mapStatus(event.event, invoice?.status ?? "pending");

  if (invoice) {
    const pix = await maybeFetchPix(payment);

    await supabase
      .from("billing_invoices")
      .update({
        status: newStatus,
        paid_at:
          event.event === "PAYMENT_CONFIRMED" || event.event === "PAYMENT_RECEIVED"
            ? payment.paymentDate ?? new Date().toISOString()
            : invoice.paid_at,
        payment_url: payment.invoiceUrl ?? invoice.payment_url,
        boleto_url: payment.bankSlipUrl ?? invoice.boleto_url,
        pix_qr_code: pix?.encodedImage ?? invoice.pix_qr_code,
        pix_copy_paste: pix?.payload ?? invoice.pix_copy_paste,
        payment_method: payment.billingType,
      })
      .eq("id", invoice.id);

    await supabase.from("billing_events").insert({
      client_id: invoice.client_id,
      invoice_id: invoice.id,
      event_type:
        event.event === "PAYMENT_CONFIRMED" || event.event === "PAYMENT_RECEIVED"
          ? "payment_received"
          : event.event === "PAYMENT_OVERDUE"
          ? "payment_overdue"
          : `asaas_${event.event.toLowerCase()}`,
      description: event.event,
      metadata: payment as unknown as Record<string, unknown>,
    });

    const { data: client } = await supabase
      .from("clients")
      .select("id, organization_id, company_name, contact_name, public_token")
      .eq("id", invoice.client_id)
      .single();

    if (client) {
      // PAYMENT_CREATED → avisa cliente que a fatura está disponível
      if (event.event === "PAYMENT_CREATED") {
        const portalLink = `${APP_URL}/portal/${client.public_token}/billing`;
        await notifyClientViaTemplate({
          clientId: client.id,
          templateName: "billing_invoice_created",
          bodyParams: [
            firstName(client.contact_name ?? client.company_name),
            safeInvoiceRef(invoice.id, payment.id),
            formatCurrency(Number(payment.value)),
            formatDate(payment.dueDate),
            portalLink,
          ],
          activityAction: "billing_invoice_notified",
          activityDescription: "Fatura enviada ao cliente via WhatsApp",
        });
      }

      // PAYMENT_CONFIRMED/RECEIVED → confirma pagamento
      if (event.event === "PAYMENT_CONFIRMED" || event.event === "PAYMENT_RECEIVED") {
        await notifyOrgAdmins({
          organizationId: client.organization_id,
          title: "Pagamento recebido 💰",
          body: `${client.company_name} pagou ${formatCurrency(Number(payment.value))}`,
          link: `/clients/${invoice.client_id}/billing`,
        });

        await notifyClientViaTemplate({
          clientId: client.id,
          templateName: "billing_payment_confirmed",
          bodyParams: [
            firstName(client.contact_name ?? client.company_name),
            formatCurrency(Number(payment.value)),
            formatDate(payment.paymentDate ?? new Date().toISOString()),
          ],
          activityAction: "payment_confirmation_sent",
          activityDescription: "Confirmação de pagamento enviada ao cliente",
        });

        await logActivity({
          clientId: invoice.client_id,
          action: "payment_received",
          description: `Pagamento recebido: ${formatCurrency(Number(payment.value))}`,
          actorType: "system",
        });
      }
    }
  }
}

function mapStatus(eventName: string, fallback: string): string {
  const statusMap: Record<string, string> = {
    PAYMENT_CREATED: "pending",
    PAYMENT_UPDATED: "pending",
    PAYMENT_CONFIRMED: "confirmed",
    PAYMENT_RECEIVED: "received",
    PAYMENT_OVERDUE: "overdue",
    PAYMENT_REFUNDED: "refunded",
    PAYMENT_DELETED: "cancelled",
  };
  return statusMap[eventName] ?? fallback;
}

async function maybeFetchPix(
  payment: AsaasPayment
): Promise<{ encodedImage: string; payload: string } | null> {
  if (payment.billingType !== "PIX") return null;
  const supabase = createAdminClient();
  const { data: config } = await supabase.from("billing_config").select("*").limit(1).maybeSingle();
  if (!isAsaasConfigured(config)) return null;
  try {
    const asaas = createAsaasClient(config!);
    const qr = await asaas.getPixQrCode(payment.id);
    return { encodedImage: qr.encodedImage, payload: qr.payload };
  } catch (err) {
    console.error("Asaas getPixQrCode failed", err);
    return null;
  }
}

function firstName(full: string): string {
  return full.trim().split(/\s+/)[0] ?? full;
}

function safeInvoiceRef(invoiceId: string, paymentId: string): string {
  return invoiceId ? invoiceId.slice(0, 8).toUpperCase() : paymentId;
}
