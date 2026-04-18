import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import type { Client } from "@/types/database";

export async function getClientByToken(token: string): Promise<Client | null> {
  const supabase = createAdminClient();
  const { data } = await supabase.from("clients").select("*").eq("public_token", token).maybeSingle();
  return (data as Client) ?? null;
}

export async function requireClientByToken(token: string): Promise<Client> {
  const client = await getClientByToken(token);
  if (!client) notFound();
  return client;
}

export async function getProposalByToken(token: string) {
  const supabase = createAdminClient();
  const { data } = await supabase.from("proposals").select("*").eq("public_token", token).maybeSingle();
  return data;
}
