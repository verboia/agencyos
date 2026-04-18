import { createAdminClient } from "@/lib/supabase/admin";

export async function createNotification(params: {
  userId: string;
  title: string;
  body: string;
  link?: string;
}) {
  const supabase = createAdminClient();
  await supabase.from("notifications").insert({
    user_id: params.userId,
    title: params.title,
    body: params.body,
    link: params.link ?? null,
  });
}

export async function notifyOrgAdmins(params: {
  organizationId: string;
  title: string;
  body: string;
  link?: string;
}) {
  const supabase = createAdminClient();
  const { data: admins } = await supabase
    .from("profiles")
    .select("id")
    .eq("organization_id", params.organizationId)
    .eq("role", "admin");

  if (!admins || admins.length === 0) return;

  await supabase.from("notifications").insert(
    admins.map((a) => ({
      user_id: a.id,
      title: params.title,
      body: params.body,
      link: params.link ?? null,
    }))
  );
}
