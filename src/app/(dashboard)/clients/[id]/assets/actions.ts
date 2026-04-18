"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/services/current-user";
import { logActivity } from "@/lib/services/activity-log";

const BUCKET = "assets";

export async function uploadAsset(clientId: string, formData: FormData) {
  const session = await requireUser();
  const file = formData.get("file") as File | null;
  if (!file) return { error: "Arquivo ausente" };

  const admin = createAdminClient();
  const category = String(formData.get("category") || "other");
  const tagsRaw = String(formData.get("tags") || "");
  const tags = tagsRaw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  const requireApproval = formData.get("require_approval") === "1";

  // Garante o bucket
  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => null);

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${clientId}/${category}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { error: uploadError.message };

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);

  const { data: asset, error } = await admin
    .from("client_assets")
    .insert({
      client_id: clientId,
      file_name: file.name,
      file_url: pub.publicUrl,
      file_size: file.size,
      file_type: file.type,
      thumbnail_url: file.type.startsWith("image/") ? pub.publicUrl : null,
      category,
      tags: tags.length ? tags : null,
      approval_status: requireApproval ? "pending" : "not_required",
      uploaded_by: session.profile?.id,
      uploaded_by_client: false,
    })
    .select()
    .single();

  if (error) return { error: error.message };

  await logActivity({
    clientId,
    action: "asset_uploaded",
    description: `Asset adicionado: ${file.name}`,
    actorId: session.profile?.id,
  });

  revalidatePath(`/clients/${clientId}`);
  return { success: true, asset };
}

export async function approveAsset(assetId: string, approved: boolean, rejectionNote?: string) {
  const supabase = await createServerClient();
  const patch: Record<string, unknown> = {
    approval_status: approved ? "approved" : "rejected",
    approved_at: approved ? new Date().toISOString() : null,
    rejection_note: approved ? null : rejectionNote ?? null,
  };
  const { data: asset, error } = await supabase
    .from("client_assets")
    .update(patch)
    .eq("id", assetId)
    .select()
    .single();
  if (error) return { error: error.message };
  revalidatePath(`/clients/${asset.client_id}`);
  return { success: true };
}

export async function deleteAsset(assetId: string) {
  const supabase = await createServerClient();
  const { data: asset } = await supabase.from("client_assets").select("*").eq("id", assetId).single();
  if (!asset) return { error: "Asset não encontrado" };
  await supabase.from("client_assets").delete().eq("id", assetId);
  revalidatePath(`/clients/${asset.client_id}`);
  return { success: true };
}
