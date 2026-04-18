export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const { error } = await supabase
    .from("tasks")
    .update({ priority: "urgent" })
    .lt("due_date", today)
    .not("status", "in", "(done,cancelled)")
    .neq("priority", "urgent");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
