import Link from "next/link";
import { requireClientByToken } from "@/lib/services/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatDate, formatNumber } from "@/lib/utils/format";
import { FileText } from "lucide-react";

export default async function PortalReportsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await requireClientByToken(token);
  const supabase = createAdminClient();

  const { data: reports } = await supabase
    .from("performance_reports")
    .select("*")
    .eq("client_id", client.id)
    .eq("visible_to_client", true)
    .order("period_start", { ascending: false });

  if (!reports || reports.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 text-center">
        <FileText className="h-10 w-10 mx-auto text-slate-400" />
        <p className="text-sm text-slate-600 mt-3">
          Ainda não há relatórios publicados. Você será avisado quando o primeiro estiver disponível.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h1 className="text-xl font-semibold">Relatórios</h1>
        <p className="text-sm text-slate-500 mt-1">Acompanhe os resultados das suas campanhas.</p>
      </div>

      {reports.map((r) => (
        <Link key={r.id} href={`/portal/${token}/reports/${r.id}`}>
          <div className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold">
                  {formatDate(r.period_start)} → {formatDate(r.period_end)}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {r.ad_spend ? `${formatCurrency(r.ad_spend)} investidos` : ""}
                  {r.leads ? ` · ${formatNumber(r.leads)} leads` : ""}
                </div>
              </div>
              <div className="text-adria text-sm font-medium">Ver →</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}
