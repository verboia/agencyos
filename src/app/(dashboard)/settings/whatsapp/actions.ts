"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/services/current-user";

export async function saveMetaWhatsappConfig(formData: FormData): Promise<void> {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");
  const supabase = await createServerClient();

  const payload = {
    organization_id: session.organizationId,
    phone_number_id: String(formData.get("phone_number_id") || "").trim(),
    business_account_id: String(formData.get("business_account_id") || "").trim(),
    access_token: String(formData.get("access_token") || "").trim(),
    app_secret: String(formData.get("app_secret") || "").trim() || null,
    webhook_verify_token: String(formData.get("webhook_verify_token") || "").trim(),
    display_phone_number: String(formData.get("display_phone_number") || "").trim() || null,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (!payload.phone_number_id || !payload.business_account_id || !payload.access_token || !payload.webhook_verify_token) {
    throw new Error("Phone Number ID, WABA ID, Access Token e Verify Token são obrigatórios");
  }

  const { data: existing } = await supabase
    .from("meta_whatsapp_config")
    .select("id")
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (existing) {
    await supabase.from("meta_whatsapp_config").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("meta_whatsapp_config").insert(payload);
  }

  revalidatePath("/settings/whatsapp");
}
