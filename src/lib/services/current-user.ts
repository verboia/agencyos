import { createServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentUser() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return {
    user,
    profile: profile as Profile | null,
    organizationId: profile?.organization_id ?? null,
  };
}

export async function requireUser() {
  const result = await getCurrentUser();
  if (!result) throw new Error("Não autenticado");
  return result;
}
