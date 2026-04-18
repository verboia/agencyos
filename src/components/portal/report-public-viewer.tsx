import { formatCurrency, formatDate, formatNumber, formatPercent } from "@/lib/utils/format";
import type { PerformanceReport } from "@/types/database";

export function ReportPublicViewer({ report }: { report: PerformanceReport }) {
  const metrics = [
    { label: "Investido", value: report.ad_spend != null ? formatCurrency(report.ad_spend) : "—" },
    { label: "Impressões", value: report.impressions != null ? formatNumber(report.impressions) : "—" },
    { label: "Cliques", value: report.clicks != null ? formatNumber(report.clicks) : "—" },
    { label: "CTR", value: report.ctr != null ? formatPercent(report.ctr, 2) : "—" },
    { label: "CPC", value: report.cpc != null ? formatCurrency(report.cpc) : "—" },
    { label: "Leads", value: report.leads != null ? formatNumber(report.leads) : "—" },
    { label: "CPL", value: report.cpl != null ? formatCurrency(report.cpl) : "—" },
    { label: "Conversões", value: report.conversions != null ? formatNumber(report.conversions) : "—" },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="text-xs text-slate-500">Relatório de performance</div>
        <h1 className="text-2xl font-semibold mt-1">
          {formatDate(report.period_start)} → {formatDate(report.period_end)}
        </h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {metrics.map((m) => (
          <div key={m.label} className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
            <div className="text-xs text-slate-500">{m.label}</div>
            <div className="text-lg font-bold mt-1">{m.value}</div>
          </div>
        ))}
      </div>

      {report.highlights && (
        <Section title="Destaques" content={report.highlights} color="text-green-700" />
      )}
      {report.improvements && (
        <Section title="Pontos de melhoria" content={report.improvements} color="text-orange-700" />
      )}
      {report.next_actions && (
        <Section title="Próximas ações" content={report.next_actions} color="text-adria" />
      )}
      {report.ai_analysis && (
        <Section title="Análise da equipe" content={report.ai_analysis} color="text-slate-800" />
      )}
    </div>
  );
}

function Section({ title, content, color }: { title: string; content: string; color: string }) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
      <h2 className={`font-semibold ${color}`}>{title}</h2>
      <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">{content}</p>
    </div>
  );
}
