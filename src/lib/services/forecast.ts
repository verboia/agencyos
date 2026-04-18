import { createAdminClient } from "@/lib/supabase/admin";
import { addMonths } from "date-fns";

export interface ForecastData {
  mrr: number;
  activeClients: number;
  expiringContracts: Array<{ id: string; company_name: string; end_date: string; monthly_value: number }>;
  churnRisk: Array<{ id: string; company_name: string; score: number; monthly_value: number }>;
  pipelineValue: number;
  pipelineCount: number;
  overdue: number;
  monthlyHistory: Array<{ month: string; received: number; expected: number }>;
  projection: Array<{ month: string; base: number; pipeline: number; risk: number; total: number }>;
}

export async function getForecast(): Promise<ForecastData> {
  const supabase = createAdminClient();

  const [{ data: clients }, { data: contracts }, { data: proposals }, { data: invoices }, { data: scores }] =
    await Promise.all([
      supabase.from("clients").select("id, company_name, monthly_fee, status").in("status", ["active", "onboarding"]),
      supabase
        .from("contracts")
        .select("id, end_date, total_monthly_value, auto_renew, client_id, client:clients(company_name)")
        .eq("status", "signed")
        .not("end_date", "is", null),
      supabase.from("proposals").select("total_monthly").in("status", ["sent", "viewed"]),
      supabase.from("billing_invoices").select("status, gross_value, paid_at, due_date"),
      supabase
        .from("client_health_scores")
        .select("client_id, overall_score, health_status")
        .order("calculated_at", { ascending: false }),
    ]);

  const mrr = (clients ?? []).reduce((sum, c) => sum + Number(c.monthly_fee || 0), 0);

  const today = new Date();
  const ninetyDays = addMonths(today, 3);
  const expiring = (contracts ?? [])
    .filter((c) => c.end_date && new Date(c.end_date) <= ninetyDays && !c.auto_renew)
    .map((c) => ({
      id: c.id,
      company_name: Array.isArray(c.client)
        ? (c.client[0] as { company_name?: string } | undefined)?.company_name ?? "—"
        : (c.client as { company_name?: string } | null)?.company_name ?? "—",
      end_date: c.end_date as string,
      monthly_value: Number(c.total_monthly_value ?? 0),
    }));

  // Risk: clientes com score crítico
  const latestByClient = new Map<string, { overall_score: number; health_status: string }>();
  for (const s of scores ?? []) {
    if (!latestByClient.has(s.client_id)) {
      latestByClient.set(s.client_id, { overall_score: s.overall_score, health_status: s.health_status });
    }
  }
  const churnRisk = (clients ?? [])
    .map((c) => {
      const latest = latestByClient.get(c.id);
      return latest && latest.health_status === "critical"
        ? { id: c.id, company_name: c.company_name, score: latest.overall_score, monthly_value: Number(c.monthly_fee) }
        : null;
    })
    .filter(Boolean) as ForecastData["churnRisk"];

  const pipelineValue = (proposals ?? []).reduce((sum, p) => sum + Number(p.total_monthly ?? 0), 0);
  const pipelineCount = proposals?.length ?? 0;

  const overdue = (invoices ?? [])
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.gross_value), 0);

  // Histórico (últimos 6 meses)
  const history: ForecastData["monthlyHistory"] = [];
  for (let i = 5; i >= 0; i--) {
    const month = addMonths(today, -i);
    const key = month.toISOString().slice(0, 7);
    const monthInvoices = (invoices ?? []).filter((inv) => (inv.paid_at ?? inv.due_date)?.startsWith(key));
    const received = monthInvoices
      .filter((i) => i.status === "received")
      .reduce((sum, i) => sum + Number(i.gross_value), 0);
    const expected = monthInvoices.reduce((sum, i) => sum + Number(i.gross_value), 0);
    history.push({ month: key, received, expected });
  }

  // Projeção (próximos 3 meses)
  const conversionRate = 0.4;
  const projection: ForecastData["projection"] = [];
  for (let i = 1; i <= 3; i++) {
    const month = addMonths(today, i);
    const key = month.toISOString().slice(0, 7);
    const base = mrr;
    const pipeline = pipelineValue * conversionRate;
    const risk = churnRisk.reduce((sum, c) => sum + c.monthly_value, 0) * 0.5;
    projection.push({
      month: key,
      base,
      pipeline,
      risk,
      total: base + pipeline - risk,
    });
  }

  return {
    mrr,
    activeClients: clients?.length ?? 0,
    expiringContracts: expiring,
    churnRisk,
    pipelineValue,
    pipelineCount,
    overdue,
    monthlyHistory: history,
    projection,
  };
}
