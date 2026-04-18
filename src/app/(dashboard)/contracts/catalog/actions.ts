"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/services/current-user";

export async function createService(formData: FormData) {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");
  const supabase = await createServerClient();
  const clausesRaw = String(formData.get("contract_clauses") || "[]");
  let clauses: unknown = [];
  try {
    clauses = JSON.parse(clausesRaw);
  } catch {
    clauses = [];
  }
  const { error } = await supabase.from("service_catalog").insert({
    organization_id: session.organizationId,
    name: String(formData.get("name")),
    slug: String(formData.get("slug")).toLowerCase().replace(/\s+/g, "-"),
    description: formData.get("description")?.toString() || null,
    internal_notes: formData.get("internal_notes")?.toString() || null,
    category: String(formData.get("category")),
    base_price: Number(formData.get("base_price")),
    price_type: String(formData.get("price_type")),
    sort_order: Number(formData.get("sort_order") || 0),
    contract_clauses: clauses,
    is_active: true,
  });
  if (error) return { error: error.message };
  revalidatePath("/contracts/catalog");
  return { success: true };
}

export async function updateService(id: string, formData: FormData) {
  const supabase = await createServerClient();
  const patch: Record<string, unknown> = {
    name: formData.get("name"),
    description: formData.get("description"),
    category: formData.get("category"),
    base_price: Number(formData.get("base_price")),
    price_type: formData.get("price_type"),
    sort_order: Number(formData.get("sort_order") || 0),
    is_active: formData.get("is_active") === "on",
  };
  const { error } = await supabase.from("service_catalog").update(patch).eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/contracts/catalog");
  return { success: true };
}

export async function deleteService(id: string) {
  const supabase = await createServerClient();
  await supabase.from("service_catalog").delete().eq("id", id);
  revalidatePath("/contracts/catalog");
  return { success: true };
}
