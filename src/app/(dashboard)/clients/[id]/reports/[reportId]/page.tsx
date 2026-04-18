import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { ReportPublicViewer } from "@/components/portal/report-public-viewer";
import { ReportActions } from "@/components/reports/report-actions";

export default async function ReportDetailsPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  const { id, reportId } = await params;
  const supabase = await createServerClient();

  const { data: report } = await supabase
    .from("performance_reports")
    .select("*, client:clients(company_name)")
    .eq("id", reportId)
    .eq("client_id", id)
    .maybeSingle();

  if (!report) notFound();

  const client = Array.isArray(report.client) ? report.client[0] : report.client;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/clients/${id}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">
                Relatório · {client?.company_name}
              </h1>
              <Badge variant={report.status === "published" || report.status === "sent" ? "success" : "secondary"}>
                {report.status === "draft" ? "Rascunho" : report.status === "published" ? "Publicado" : "Enviado"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {formatDate(report.period_start)} → {formatDate(report.period_end)}
            </p>
          </div>
        </div>
        <ReportActions report={report} />
      </div>

      <div className="bg-white dark:bg-card rounded-xl p-6 border border-border text-foreground">
        <ReportPublicViewer report={report} />
      </div>
    </div>
  );
}
