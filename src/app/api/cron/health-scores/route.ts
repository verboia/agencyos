export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateHealthScoreForClient } from "@/lib/services/health-score";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminClient();
  const { data: clients } = await supabase.from("clients").select("id").in("status", ["active", "onboarding"]);
  let processed = 0;
  for (const c of clients ?? []) {
    await calculateHealthScoreForClient(c.id);
    processed++;
  }
  return NextResponse.json({ processed });
}
