export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MetaWebhookEvent } from "@/lib/whatsapp/meta/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode !== "subscribe" || !token || !challenge) {
    return NextResponse.json({ error: "invalid_verification" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: config } = await supabase
    .from("meta_whatsapp_config")
    .select("webhook_verify_token")
    .eq("webhook_verify_token", token)
    .maybeSingle();

  if (!config) {
    return NextResponse.json({ error: "invalid_verify_token" }, { status: 403 });
  }

  return new NextResponse(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-hub-signature-256") ?? "";

  const supabase = createAdminClient();
  const { data: configs } = await supabase
    .from("meta_whatsapp_config")
    .select("organization_id, app_secret, phone_number_id")
    .eq("is_active", true);

  const matchedConfig = configs?.find((c) => {
    if (!c.app_secret) return false;
    const expected = "sha256=" + createHmac("sha256", c.app_secret).update(rawBody).digest("hex");
    try {
      return (
        signature.length === expected.length &&
        timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
      );
    } catch {
      return false;
    }
  });

  if (configs && configs.length > 0 && configs.some((c) => c.app_secret) && !matchedConfig) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  let event: MetaWebhookEvent;
  try {
    event = JSON.parse(rawBody) as MetaWebhookEvent;
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  try {
    for (const entry of event.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "messages") continue;
        const value = change.value;

        for (const msg of value.messages ?? []) {
          await supabase.from("whatsapp_inbound_messages").insert({
            phone_number_id: value.metadata.phone_number_id,
            from_phone: msg.from,
            wa_message_id: msg.id,
            message_type: msg.type,
            body: msg.text?.body ?? null,
            received_at: new Date(Number(msg.timestamp) * 1000).toISOString(),
            raw: msg as unknown as Record<string, unknown>,
          });
        }

        for (const status of value.statuses ?? []) {
          await supabase
            .from("whatsapp_message_status")
            .insert({
              wa_message_id: status.id,
              status: status.status,
              recipient_phone: status.recipient_id,
              status_at: new Date(Number(status.timestamp) * 1000).toISOString(),
            })
            .select();
        }
      }
    }
  } catch (err) {
    console.error("Meta WhatsApp webhook processing error", err);
  }

  return NextResponse.json({ received: true });
}
