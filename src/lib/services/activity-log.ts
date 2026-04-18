import { createAdminClient } from "@/lib/supabase/admin";

export type ActivityActorType = "team" | "client" | "system" | "ai";

export async function logActivity(params: {
  clientId: string;
  action: string;
  description: string;
  actorId?: string | null;
  actorType?: ActivityActorType;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createAdminClient();
  await supabase.from("activity_log").insert({
    client_id: params.clientId,
    action: params.action,
    description: params.description,
    actor_id: params.actorId ?? null,
    actor_type: params.actorType ?? "team",
    metadata: params.metadata ?? null,
  });
}
