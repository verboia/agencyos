export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createMetaClient, isMetaConfigured } from "@/lib/meta/client";

function verifyCron(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!verifyCron(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const supabase = createAdminClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, meta_ad_account_id, meta_access_token, company_name")
    .in("status", ["active", "onboarding"]);

  let processed = 0;
  const today = new Date();
  const since = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const until = today.toISOString().slice(0, 10);

  for (const client of clients ?? []) {
    if (!isMetaConfigured({ ad_account_id: client.meta_ad_account_id, access_token: client.meta_access_token })) {
      continue;
    }
    try {
      const meta = createMetaClient({
        ad_account_id: client.meta_ad_account_id,
        access_token: client.meta_access_token,
      });
      const insights = await meta.getInsights(since, until);
      if (insights) {
        // Upsert no report do mês corrente
        const { data: existing } = await supabase
          .from("performance_reports")
          .select("id")
          .eq("client_id", client.id)
          .eq("period_start", since)
          .eq("period_end", until)
          .maybeSingle();

        const payload = {
          client_id: client.id,
          period_start: since,
          period_end: until,
          report_type: "monthly" as const,
          ad_spend: insights.spend,
          impressions: insights.impressions,
          clicks: insights.clicks,
          ctr: insights.ctr,
          cpc: insights.cpc,
          leads: insights.conversions,
          cpl: insights.cost_per_conversion,
          conversions: insights.conversions,
          status: "draft" as const,
        };

        if (existing) {
          await supabase.from("performance_reports").update(payload).eq("id", existing.id);
        } else {
          await supabase.from("performance_reports").insert(payload);
        }
        processed++;
      }
    } catch (err) {
      console.error(`Meta error for ${client.company_name}`, err);
    }
  }

  return NextResponse.json({ processed });
}
