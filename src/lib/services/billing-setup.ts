import { createAdminClient } from "@/lib/supabase/admin";
import { createAsaasClient, isAsaasConfigured } from "@/lib/asaas/client";
import { logActivity } from "@/lib/services/activity-log";

export async function setupBillingOnContractSigned(contractId: string, clientId: string) {
  const supabase = createAdminClient();

  const [{ data: contract }, { data: client }, { data: config }] = await Promise.all([
    supabase.from("contracts").select("*").eq("id", contractId).single(),
    supabase.from("clients").select("*").eq("id", clientId).single(),
    supabase.from("billing_config").select("*").limit(1).maybeSingle(),
  ]);

  if (!contract || !client) return;

  // Cria ou atualiza client_billing
  const { data: existingBilling } = await supabase
    .from("client_billing")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  const billingPayload = {
    client_id: clientId,
    monthly_value: contract.total_monthly_value ?? client.monthly_fee,
    implementation_value: contract.implementation_fee,
    payment_method: contract.payment_method ?? "PIX",
    due_day: contract.payment_due_day,
    subscription_status: "pending" as const,
  };

  if (!existingBilling) {
    await supabase.from("client_billing").insert(billingPayload);
  } else {
    await supabase.from("client_billing").update(billingPayload).eq("id", existingBilling.id);
  }

  // Se Asaas está configurado, cria customer + subscription
  if (isAsaasConfigured(config)) {
    try {
      const asaas = createAsaasClient(config!);
      const customer = await asaas.createCustomer({
        name: contract.legal_name ?? client.company_name,
        cpfCnpj: contract.document_number ?? "",
        email: client.contact_email ?? undefined,
        phone: client.contact_phone,
        postalCode: contract.address_zip ?? undefined,
        address: contract.address_street ?? undefined,
        addressNumber: contract.address_number ?? undefined,
        complement: contract.address_complement ?? undefined,
        province: contract.address_neighborhood ?? undefined,
      });

      const subscription = await asaas.createSubscription({
        customer: customer.id,
        billingType: (contract.payment_method as "PIX" | "BOLETO" | "CREDIT_CARD") ?? "PIX",
        value: contract.total_monthly_value ?? client.monthly_fee,
        nextDueDate: computeNextDueDate(contract.payment_due_day),
        cycle: "MONTHLY",
        description: `${client.plan_name} — ${client.company_name}`,
        maxPayments: contract.contract_months,
      });

      await supabase
        .from("client_billing")
        .update({
          asaas_customer_id: customer.id,
          asaas_subscription_id: subscription.id,
          subscription_status: "active",
        })
        .eq("client_id", clientId);

      // Cobrança de implementação (se tiver)
      if (contract.has_implementation && contract.implementation_fee) {
        const implPayment = await asaas.createPayment({
          customer: customer.id,
          billingType: (contract.payment_method as "PIX" | "BOLETO" | "CREDIT_CARD") ?? "PIX",
          value: contract.implementation_fee,
          dueDate: computeNextDueDate(contract.payment_due_day),
          description: `Implementação — ${client.company_name}`,
        });

        await supabase.from("billing_invoices").insert({
          client_id: clientId,
          asaas_payment_id: implPayment.id,
          invoice_type: "implementation",
          gross_value: contract.implementation_fee,
          net_value: contract.implementation_fee,
          due_date: computeNextDueDate(contract.payment_due_day),
          status: "pending",
          payment_url: implPayment.invoiceUrl,
          description: `Implementação — ${client.company_name}`,
        });
      }
    } catch (err) {
      console.error("Asaas setup failed", err);
      await logActivity({
        clientId,
        action: "billing_setup_failed",
        description: "Falha ao criar cobrança no Asaas — setup manual necessário",
        actorType: "system",
        metadata: { error: String(err) },
      });
    }
  } else {
    // Modo mock: cria cobrança simulada
    await supabase.from("billing_invoices").insert({
      client_id: clientId,
      invoice_type: "recurring",
      gross_value: contract.total_monthly_value ?? client.monthly_fee,
      net_value: contract.total_monthly_value ?? client.monthly_fee,
      due_date: computeNextDueDate(contract.payment_due_day),
      status: "pending",
      description: `${client.plan_name} — Primeiro mês (mock)`,
    });

    await supabase
      .from("client_billing")
      .update({ subscription_status: "active" })
      .eq("client_id", clientId);
  }

  await supabase.from("billing_events").insert({
    client_id: clientId,
    event_type: "subscription_created",
    description: "Assinatura criada a partir do contrato assinado",
  });
}

function computeNextDueDate(dueDay: number): string {
  const today = new Date();
  const target = new Date(today.getFullYear(), today.getMonth(), dueDay);
  if (target <= today) target.setMonth(target.getMonth() + 1);
  return target.toISOString().slice(0, 10);
}
