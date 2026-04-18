"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/services/current-user";
import { logActivity } from "@/lib/services/activity-log";

export async function createAdditionalInvoice(formData: FormData) {
  const session = await requireUser();
  const supabase = await createServerClient();

  const clientId = String(formData.get("client_id"));
  const value = Number(formData.get("value"));
  const dueDate = String(formData.get("due_date"));
  const description = String(formData.get("description") || "Cobrança avulsa");

  const { error } = await supabase.from("billing_invoices").insert({
    client_id: clientId,
    invoice_type: "additional",
    gross_value: value,
    net_value: value,
    due_date: dueDate,
    status: "pending",
    description,
  });

  if (error) return { error: error.message };

  await logActivity({
    clientId,
    action: "invoice_created",
    description: `Cobrança avulsa criada: ${description}`,
    actorId: session.profile?.id,
  });

  revalidatePath("/billing");
  revalidatePath(`/clients/${clientId}/billing`);
  return { success: true };
}
