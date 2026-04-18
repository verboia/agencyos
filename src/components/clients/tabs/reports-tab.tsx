import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { AdMetricsSummary } from "@/components/clients/ad-metrics-summary";

export async function ClientReportsTab({ clientId }: { clientId: string }) {
  const supabase = await createServerClient();
  const { data: reports } = await supabase
    .from("performance_reports")
    .select("*")
    .eq("client_id", clientId)
    .order("period_start", { ascending: false });

  return (
    <div className="space-y-4">
      <AdMetricsSummary clientId={clientId} daysBack={30} />

      <div className="flex items-center justify-between gap-2 pt-2">
        <h3 className="text-sm font-semibold">Relatórios mensais publicados</h3>
        <Button asChild size="sm">
          <Link href={`/clients/${clientId}/reports/new`}>
            <Plus className="h-4 w-4" /> Novo relatório
          </Link>
        </Button>
      </div>
      {!reports || reports.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Ainda não há relatórios.</p>
          </CardContent>
        </Card>
      ) : (
        reports.map((r) => (
          <Link key={r.id} href={`/clients/${clientId}/reports/${r.id}`}>
            <Card className="p-4 hover:bg-accent transition-colors">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {formatDate(r.period_start)} → {formatDate(r.period_end)}
                    </span>
                    <Badge variant={r.status === "published" || r.status === "sent" ? "success" : "secondary"}>
                      {r.status === "draft" ? "Rascunho" : r.status === "published" ? "Publicado" : "Enviado"}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {r.ad_spend ? formatCurrency(r.ad_spend) + " investidos" : ""}
                    {r.leads ? ` · ${r.leads} leads` : ""}
                  </div>
                </div>
                <Button variant="outline" size="sm">Abrir</Button>
              </div>
            </Card>
          </Link>
        ))
      )}
    </div>
  );
}
