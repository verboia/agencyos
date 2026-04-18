"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/services/current-user";

export async function saveBillingConfig(formData: FormData) {
  const session = await requireUser();
  if (!session.organizationId) return { error: "Organização não encontrada" };
  const supabase = await createServerClient();

  const payload: Record<string, unknown> = {
    organization_id: session.organizationId,
    asaas_api_key: formData.get("asaas_api_key")?.toString() || null,
    asaas_environment: String(formData.get("asaas_environment") ?? "sandbox"),
    company_legal_name: formData.get("company_legal_name")?.toString() || null,
    company_document: formData.get("company_document")?.toString() || null,
    default_payment_method: String(formData.get("default_payment_method") ?? "PIX"),
    default_due_day: Number(formData.get("default_due_day") ?? 10),
    default_fine_percentage: Number(formData.get("default_fine_percentage") ?? 2),
    default_interest_monthly: Number(formData.get("default_interest_monthly") ?? 1),
    pause_service_after_days: Number(formData.get("pause_service_after_days") ?? 15),
    is_active: true,
  };

  const { data: existing } = await supabase
    .from("billing_config")
    .select("id")
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (existing) {
    await supabase.from("billing_config").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("billing_config").insert(payload);
  }

  revalidatePath("/settings/billing");
  return { success: true };
}
