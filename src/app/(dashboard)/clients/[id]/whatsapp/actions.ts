"use server";

import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/services/current-user";
import { sendToClientGroups, type SendResult } from "@/lib/services/whatsapp";
import {
  buildClientReportText,
  buildBalanceAlertText,
} from "@/lib/services/whatsapp-templates";

export interface SendPreview {
  text: string;
  groups: Array<{ id: string; group_id: string; group_subject: string | null; purpose: string }>;
}

async function assertClientInOrg(clientId: string): Promise<void> {
  const session = await requireUser();
  if (!session.organizationId) throw new Error("Organização não encontrada");

  const supabase = await createServerClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id")
    .eq("id", clientId)
    .maybeSingle();
  if (!client) throw new Error("Cliente não encontrado");
}

async function listLinkedGroups(
  clientId: string,
  filter: "reports" | "balance_alerts"
): Promise<SendPreview["groups"]> {
  const supabase = await createServerClient();
  const { data } = await supabase
    .from("client_whatsapp_groups")
    .select(
      "id, group_id, group_subject, purpose, send_weekly_report, send_monthly_report, send_balance_alerts"
    )
    .eq("client_id", clientId)
    .eq("is_active", true);

  const rows = data ?? [];
  return rows
    .filter((r) => (filter === "balance_alerts" ? r.send_balance_alerts : true))
    .map((r) => ({
      id: r.id,
      group_id: r.group_id,
      group_subject: r.group_subject ?? null,
      purpose: r.purpose,
    }));
}

export async function previewReport(
  clientId: string,
  daysBack: number
): Promise<SendPreview> {
  await assertClientInOrg(clientId);
  const report = await buildClientReportText({ clientId, daysBack });
  const groups = await listLinkedGroups(clientId, "reports");
  return { text: report.text, groups };
}

export async function previewBalanceAlert(clientId: string): Promise<SendPreview> {
  await assertClientInOrg(clientId);
  const alert = await buildBalanceAlertText({ clientId });
  const groups = await listLinkedGroups(clientId, "balance_alerts");
  return { text: alert.text, groups };
}

export interface SendOutcome {
  total: number;
  sent: number;
  failed: number;
  mock: number;
  results: SendResult[];
}

export async function sendClientReport(
  clientId: string,
  daysBack: number
): Promise<SendOutcome> {
  await assertClientInOrg(clientId);
  const report = await buildClientReportText({ clientId, daysBack });
  const result = await sendToClientGroups(clientId, report.text, "manual", {
    metadata: { daysBack, period_label: report.periodLabel },
  });

  revalidatePath(`/clients/${clientId}`);
  return summarize(result);
}

export async function sendClientBalanceAlert(
  clientId: string
): Promise<SendOutcome> {
  await assertClientInOrg(clientId);
  const alert = await buildBalanceAlertText({ clientId });
  const result = await sendToClientGroups(clientId, alert.text, "balance_alert", {
    metadata: { has_any_low_balance: alert.hasAnyLowBalance },
  });

  revalidatePath(`/clients/${clientId}`);
  return summarize(result);
}

function summarize(result: { total: number; sent: number; results: SendResult[] }): SendOutcome {
  let failed = 0;
  let mock = 0;
  for (const r of result.results) {
    if (r.mock) mock++;
    else if (!r.sent) failed++;
  }
  return {
    total: result.total,
    sent: result.sent,
    failed,
    mock,
    results: result.results,
  };
}
