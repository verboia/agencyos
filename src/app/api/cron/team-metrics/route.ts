export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { computeDailyMetrics, computeMonthlyMetrics } from "@/lib/services/team-metrics";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminClient();
  const { data: orgs } = await supabase.from("organizations").select("id");
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  for (const org of orgs ?? []) {
    await computeDailyMetrics(org.id, yesterday);
    await computeMonthlyMetrics(org.id, yesterday.getMonth() + 1, yesterday.getFullYear());
  }

  return NextResponse.json({ success: true });
}
