"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/services/current-user";

export async function createTeamMember(formData: FormData): Promise<{ error?: string; success?: boolean }> {
  const session = await requireUser();
  if (session.profile?.role !== "admin") {
    return { error: "Apenas administradores podem adicionar membros" };
  }
  if (!session.organizationId) return { error: "Organização não encontrada" };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "operator") as "admin" | "operator";

  if (!email || !password || !fullName) {
    return { error: "Preencha todos os campos" };
  }
  if (password.length < 6) {
    return { error: "Senha precisa ter ao menos 6 caracteres" };
  }

  const admin = createAdminClient();

  const { data: created, error: authError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, role },
  });

  if (authError || !created?.user) {
    return { error: authError?.message ?? "Falha ao criar usuário" };
  }

  await admin
    .from("profiles")
    .upsert(
      {
        id: created.user.id,
        organization_id: session.organizationId,
        full_name: fullName,
        role,
        email,
      },
      { onConflict: "id" }
    );

  revalidatePath("/settings/team");
  revalidatePath("/clients/new");
  return { success: true };
}

export async function updateMemberRole(profileId: string, role: "admin" | "operator") {
  const session = await requireUser();
  if (session.profile?.role !== "admin") return { error: "Apenas admin" };
  const admin = createAdminClient();
  const { error } = await admin.from("profiles").update({ role }).eq("id", profileId);
  if (error) return { error: error.message };
  revalidatePath("/settings/team");
  return { success: true };
}

export async function removeMember(profileId: string) {
  const session = await requireUser();
  if (session.profile?.role !== "admin") return { error: "Apenas admin" };
  if (profileId === session.profile.id) return { error: "Você não pode remover a si mesmo" };
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(profileId);
  if (error) return { error: error.message };
  revalidatePath("/settings/team");
  return { success: true };
}
