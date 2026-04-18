"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/services/current-user";

export async function saveMetaAdsConfig(formData: FormData): Promise<void> {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");
  const supabase = await createServerClient();

  const payload = {
    organization_id: session.organizationId,
    platform: "meta" as const,
    app_id: String(formData.get("app_id") || "").trim(),
    app_secret: String(formData.get("app_secret") || "").trim(),
    api_version: String(formData.get("api_version") || "v21.0").trim() || "v21.0",
    is_active: formData.get("is_active") === "on",
    updated_at: new Date().toISOString(),
  };

  if (!payload.app_id || !payload.app_secret) {
    throw new Error("App ID e App Secret são obrigatórios");
  }

  const { data: existing } = await supabase
    .from("ad_platform_configs")
    .select("id")
    .eq("organization_id", session.organizationId)
    .eq("platform", "meta")
    .maybeSingle();

  if (existing) {
    await supabase.from("ad_platform_configs").update(payload).eq("id", existing.id);
  } else {
    await supabase.from("ad_platform_configs").insert(payload);
  }

  revalidatePath("/settings/meta-ads");
}
