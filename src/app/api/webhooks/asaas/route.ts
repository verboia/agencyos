export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { processAsaasWebhook } from "@/lib/asaas/webhooks";

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.ASAAS_WEBHOOK_SECRET;
  if (expectedSecret) {
    const headerToken = request.headers.get("asaas-access-token") ?? request.headers.get("authorization");
    if (!headerToken || !headerToken.includes(expectedSecret)) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  try {
    const body = await request.json();
    await processAsaasWebhook(body);
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Asaas webhook error", err);
    return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
  }
}
