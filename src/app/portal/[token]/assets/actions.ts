"use server";

import { revalidatePath } from "next/cache";
import { getClientByToken } from "@/lib/services/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/services/activity-log";

const BUCKET = "assets";

export async function uploadAssetAsClient(token: string, formData: FormData) {
  const client = await getClientByToken(token);
  if (!client) return { error: "Cliente não encontrado" };

  const file = formData.get("file") as File | null;
  if (!file) return { error: "Arquivo ausente" };

  const supabase = createAdminClient();
  const category = String(formData.get("category") || "other");

  await supabase.storage.createBucket(BUCKET, { public: true }).catch(() => null);

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${client.id}/${category}/client-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
  });
  if (upErr) return { error: upErr.message };
  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { error } = await supabase.from("client_assets").insert({
    client_id: client.id,
    file_name: file.name,
    file_url: pub.publicUrl,
    file_size: file.size,
    file_type: file.type,
    thumbnail_url: file.type.startsWith("image/") ? pub.publicUrl : null,
    category,
    approval_status: "not_required",
    uploaded_by_client: true,
  });
  if (error) return { error: error.message };

  await logActivity({
    clientId: client.id,
    action: "asset_uploaded_by_client",
    description: `Cliente enviou arquivo: ${file.name}`,
    actorType: "client",
  });

  revalidatePath(`/portal/${token}/assets`);
  revalidatePath(`/clients/${client.id}`);
  return { success: true };
}

export async function respondToApproval(token: string, assetId: string, approved: boolean, note?: string) {
  const client = await getClientByToken(token);
  if (!client) return { error: "Cliente não encontrado" };
  const supabase = createAdminClient();
  const { data: asset } = await supabase
    .from("client_assets")
    .select("*")
    .eq("id", assetId)
    .eq("client_id", client.id)
    .maybeSingle();
  if (!asset) return { error: "Asset não encontrado" };

  await supabase
    .from("client_assets")
    .update({
      approval_status: approved ? "approved" : "rejected",
      approved_at: approved ? new Date().toISOString() : null,
      rejection_note: approved ? null : note ?? null,
    })
    .eq("id", assetId);

  await logActivity({
    clientId: client.id,
    action: approved ? "asset_approved" : "asset_rejected",
    description: `${client.contact_name} ${approved ? "aprovou" : "rejeitou"} ${asset.file_name}`,
    actorType: "client",
  });

  revalidatePath(`/portal/${token}/approvals`);
  revalidatePath(`/clients/${client.id}`);
  return { success: true };
}
