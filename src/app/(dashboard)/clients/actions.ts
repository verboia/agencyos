"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/services/current-user";
import { generateOnboardingTasks } from "@/lib/services/task-generator";
import { logActivity } from "@/lib/services/activity-log";
import { createClientWhatsAppGroup } from "@/lib/services/whatsapp";

const clientSchema = z.object({
  company_name: z.string().min(2, "Nome da empresa obrigatório"),
  contact_name: z.string().min(2, "Nome do contato obrigatório"),
  contact_phone: z.string().min(10, "Telefone inválido"),
  contact_email: z.string().email().optional().or(z.literal("")),
  segment: z.string().optional(),
  monthly_fee: z.number().min(0),
  contract_months: z.number().int().min(1).max(60),
  contract_start: z.string().optional(),
  assigned_to: z.string().uuid().optional().or(z.literal("")),
});

export async function createClient(formData: FormData) {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");

  const parsed = clientSchema.safeParse({
    company_name: formData.get("company_name"),
    contact_name: formData.get("contact_name"),
    contact_phone: formData.get("contact_phone"),
    contact_email: formData.get("contact_email") || "",
    segment: formData.get("segment") || "",
    monthly_fee: Number(formData.get("monthly_fee") || 1500),
    contract_months: Number(formData.get("contract_months") || 12),
    contract_start: formData.get("contract_start")?.toString() || undefined,
    assigned_to: formData.get("assigned_to")?.toString() || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createServerClient();
  const admin = createAdminClient();
  const assignedTo = parsed.data.assigned_to || session.profile?.id || null;
  const cleanedPhone = parsed.data.contact_phone.replace(/\D/g, "");

  // Guarda de idempotência: se o mesmo contato foi cadastrado nos últimos 60s, redireciona pro existente.
  const sixtySecondsAgo = new Date(Date.now() - 60_000).toISOString();
  const { data: recentDuplicate } = await supabase
    .from("clients")
    .select("id")
    .eq("organization_id", session.organizationId)
    .eq("company_name", parsed.data.company_name)
    .eq("contact_phone", cleanedPhone)
    .gte("created_at", sixtySecondsAgo)
    .maybeSingle();

  if (recentDuplicate) {
    redirect(`/clients/${recentDuplicate.id}`);
  }

  const { data: client, error } = await supabase
    .from("clients")
    .insert({
      organization_id: session.organizationId,
      company_name: parsed.data.company_name,
      contact_name: parsed.data.contact_name,
      contact_phone: cleanedPhone,
      contact_email: parsed.data.contact_email || null,
      segment: parsed.data.segment || null,
      monthly_fee: parsed.data.monthly_fee,
      contract_months: parsed.data.contract_months,
      contract_start: parsed.data.contract_start || null,
      assigned_to: assignedTo,
      status: "onboarding",
    })
    .select()
    .single();

  if (error || !client) {
    return { error: error?.message ?? "Falha ao criar cliente" };
  }

  await admin.from("client_briefings").insert({ client_id: client.id, status: "pending" });

  await generateOnboardingTasks(client.id, session.organizationId, assignedTo);

  // Dispara criação de grupo WhatsApp (fire-and-forget; mock se não configurado)
  createClientWhatsAppGroup(client.id).catch(() => null);

  await logActivity({
    clientId: client.id,
    action: "client_created",
    description: `Cliente ${client.company_name} cadastrado`,
    actorId: session.profile?.id,
    actorType: "team",
  });

  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/clients/${client.id}`);
}

export async function updateClient(id: string, formData: FormData) {
  const session = await requireUser();
  const supabase = await createServerClient();

  const patch: Record<string, unknown> = {};
  const fields = [
    "company_name",
    "contact_name",
    "contact_phone",
    "contact_email",
    "segment",
    "status",
    "assigned_to",
    "monthly_fee",
    "contract_months",
    "contract_start",
    "meta_ad_account_id",
    "meta_pixel_id",
  ];
  for (const f of fields) {
    const v = formData.get(f);
    if (v !== null) patch[f] = typeof v === "string" && v === "" ? null : v;
  }
  if (typeof patch.monthly_fee === "string") patch.monthly_fee = Number(patch.monthly_fee);
  if (typeof patch.contract_months === "string") patch.contract_months = Number(patch.contract_months);

  const { error } = await supabase.from("clients").update(patch).eq("id", id);
  if (error) return { error: error.message };

  await logActivity({
    clientId: id,
    action: "client_updated",
    description: "Dados do cliente atualizados",
    actorId: session.profile?.id,
  });

  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
  return { success: true };
}

export async function deleteClient(id: string) {
  const session = await requireUser();
  if (session.profile?.role !== "admin") {
    return { error: "Apenas administradores podem excluir clientes" };
  }
  const admin = createAdminClient();

  // FK sem cascade: precisa soltar a referência antes de apagar.
  await admin
    .from("proposals")
    .update({ converted_client_id: null, converted_contract_id: null })
    .eq("converted_client_id", id);

  const { error } = await admin.from("clients").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath("/");
  redirect("/clients");
}
