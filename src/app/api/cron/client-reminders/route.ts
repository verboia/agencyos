export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendWhatsAppMessage } from "@/lib/services/whatsapp";
import { logActivity } from "@/lib/services/activity-log";
import { APP_URL } from "@/lib/utils/constants";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const today = new Date();
  let briefingReminders = 0;
  let contractReminders = 0;

  const { data: pendingBriefings } = await supabase
    .from("client_briefings")
    .select("client_id, created_at, client:clients(id, company_name, contact_name, contact_phone, public_token, status)")
    .eq("status", "pending");

  for (const b of pendingBriefings ?? []) {
    const client = Array.isArray(b.client) ? b.client[0] : b.client;
    if (!client || client.status !== "onboarding") continue;
    const days = Math.floor((today.getTime() - new Date(b.created_at).getTime()) / 86400000);
    if ([2, 5].includes(days)) {
      const text = `Oi ${client.contact_name.split(" ")[0]}! Pra começarmos a rodar suas campanhas, precisamos do briefing. Leva menos de 10 min: ${APP_URL}/portal/${client.public_token}/briefing`;
      await sendWhatsAppMessage(client.contact_phone, text);
      await logActivity({
        clientId: client.id,
        action: "reminder_sent",
        description: `Lembrete de briefing (dia ${days})`,
        actorType: "system",
      });
      briefingReminders++;
    }
  }

  const { data: pendingContracts } = await supabase
    .from("contracts")
    .select("id, sent_at, client_id, client:clients(id, company_name, contact_name, contact_phone, public_token)")
    .in("status", ["sent", "viewed"]);

  for (const c of pendingContracts ?? []) {
    const client = Array.isArray(c.client) ? c.client[0] : c.client;
    if (!client || !c.sent_at) continue;
    const days = Math.floor((today.getTime() - new Date(c.sent_at).getTime()) / 86400000);
    if ([3, 5].includes(days)) {
      const text = `Oi ${client.contact_name.split(" ")[0]}! Pra formalizar nossa parceria, o contrato está pronto: ${APP_URL}/portal/${client.public_token}/contract`;
      await sendWhatsAppMessage(client.contact_phone, text);
      await logActivity({
        clientId: client.id,
        action: "reminder_sent",
        description: `Lembrete de contrato (dia ${days})`,
        actorType: "system",
      });
      contractReminders++;
    }
  }

  return NextResponse.json({ briefingReminders, contractReminders });
}
