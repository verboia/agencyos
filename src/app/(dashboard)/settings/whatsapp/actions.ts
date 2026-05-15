"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/services/current-user";
import { createWapiClient, isWapiConfigured, normalizeGroupId, getGroupName } from "@/lib/wapi/client";
import type { WapiConfig } from "@/lib/wapi/types";

export async function saveWapiConfig(formData: FormData): Promise<void> {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");
  const supabase = await createServerClient();

  const payload = {
    organization_id: session.organizationId,
    instance_id: String(formData.get("instance_id") || "").trim(),
    token: String(formData.get("token") || "").trim(),
    display_phone_number: String(formData.get("display_phone_number") || "").trim() || null,
    is_active: true,
    updated_at: new Date().toISOString(),
  };

  if (!payload.instance_id || !payload.token) {
    throw new Error("Instance ID e Token são obrigatórios.");
  }

  const { data: existing } = await supabase
    .from("wapi_config")
    .select("organization_id")
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (existing) {
    await supabase.from("wapi_config").update(payload).eq("organization_id", session.organizationId);
  } else {
    await supabase.from("wapi_config").insert(payload);
  }

  revalidatePath("/settings/whatsapp");
}

/**
 * Chama get-all-groups na W-API e cacheia em wapi_groups_cache.
 * O resultado é refletido na UI via last_groups_sync_* na wapi_config.
 */
export async function syncWapiGroups(): Promise<void> {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");

  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from("wapi_config")
    .select("instance_id, token, is_active")
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (!isWapiConfigured(config as WapiConfig | null)) {
    await supabase
      .from("wapi_config")
      .update({
        last_groups_sync_at: new Date().toISOString(),
        last_groups_sync_error: "Configure instance_id e token primeiro.",
      })
      .eq("organization_id", session.organizationId);
    revalidatePath("/settings/whatsapp");
    return;
  }

  try {
    const client = createWapiClient(config as WapiConfig);
    const groups = await client.listGroups();

    const rows = groups.map((g) => ({
      organization_id: session.organizationId,
      group_id: normalizeGroupId(g.id),
      subject: getGroupName(g),
      participants_count: g.participantsCount ?? g.participants?.length ?? null,
      is_admin: g.isAdmin ?? null,
      raw: g as unknown as Record<string, unknown>,
      synced_at: new Date().toISOString(),
    }));

    // Limpa cache antigo e regrava (mais simples que diff)
    await supabase
      .from("wapi_groups_cache")
      .delete()
      .eq("organization_id", session.organizationId);

    if (rows.length > 0) {
      await supabase.from("wapi_groups_cache").insert(rows);
    }

    await supabase
      .from("wapi_config")
      .update({
        last_groups_sync_at: new Date().toISOString(),
        last_groups_sync_count: rows.length,
        last_groups_sync_error: null,
      })
      .eq("organization_id", session.organizationId);
  } catch (err) {
    const errorMessage = String(err).slice(0, 500);
    await supabase
      .from("wapi_config")
      .update({
        last_groups_sync_at: new Date().toISOString(),
        last_groups_sync_error: errorMessage,
      })
      .eq("organization_id", session.organizationId);
  }

  revalidatePath("/settings/whatsapp");
}

export async function linkGroupToClient(formData: FormData): Promise<void> {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");
  const supabase = await createServerClient();

  const groupId = String(formData.get("group_id") || "").trim();
  const groupSubject = String(formData.get("group_subject") || "").trim() || null;
  const clientId = String(formData.get("client_id") || "").trim();
  const purpose = String(formData.get("purpose") || "reports").trim();

  if (!groupId || !clientId) throw new Error("Selecione grupo e cliente.");

  const { error } = await supabase.from("client_whatsapp_groups").upsert(
    {
      organization_id: session.organizationId,
      client_id: clientId,
      group_id: normalizeGroupId(groupId),
      group_subject: groupSubject,
      purpose,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "client_id,group_id" }
  );

  if (error) throw new Error(`Falha ao vincular grupo: ${error.message}`);

  revalidatePath("/settings/whatsapp");
  revalidatePath(`/clients/${clientId}`);
}

export async function unlinkGroupFromClient(formData: FormData): Promise<void> {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");
  const supabase = await createServerClient();

  const linkId = String(formData.get("link_id") || "").trim();
  if (!linkId) throw new Error("ID do vínculo ausente.");

  const { data: row } = await supabase
    .from("client_whatsapp_groups")
    .select("client_id")
    .eq("id", linkId)
    .maybeSingle();

  await supabase.from("client_whatsapp_groups").delete().eq("id", linkId);

  revalidatePath("/settings/whatsapp");
  if (row?.client_id) revalidatePath(`/clients/${row.client_id}`);
}

export async function updateGroupLinkSettings(formData: FormData): Promise<void> {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");
  const supabase = await createServerClient();

  const linkId = String(formData.get("link_id") || "").trim();
  if (!linkId) throw new Error("ID do vínculo ausente.");

  const payload = {
    purpose: String(formData.get("purpose") || "reports").trim(),
    send_weekly_report: formData.get("send_weekly_report") === "on",
    send_daily_report: formData.get("send_daily_report") === "on",
    send_monthly_report: formData.get("send_monthly_report") === "on",
    send_balance_alerts: formData.get("send_balance_alerts") === "on",
    low_balance_threshold: Number(formData.get("low_balance_threshold") || 100),
    is_active: formData.get("is_active") === "on",
    updated_at: new Date().toISOString(),
  };

  const { data: row } = await supabase
    .from("client_whatsapp_groups")
    .select("client_id")
    .eq("id", linkId)
    .maybeSingle();

  await supabase.from("client_whatsapp_groups").update(payload).eq("id", linkId);

  revalidatePath("/settings/whatsapp");
  if (row?.client_id) revalidatePath(`/clients/${row.client_id}`);
}
