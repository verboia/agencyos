export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { generateRecurringTasks } from "@/lib/services/task-generator";
import { createAdminClient } from "@/lib/supabase/admin";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminClient();
  const { data: orgs } = await supabase.from("organizations").select("id");
  let total = 0;
  for (const org of orgs ?? []) {
    total += await generateRecurringTasks("recurring_monthly", org.id);
  }
  return NextResponse.json({ generated: total });
}
