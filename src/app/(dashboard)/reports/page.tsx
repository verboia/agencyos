import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDate, formatCurrency } from "@/lib/utils/format";
import { FileText } from "lucide-react";

export default async function ReportsPage() {
  const supabase = await createServerClient();
  const { data: reports } = await supabase
    .from("performance_reports")
    .select("*, client:clients(id, company_name)")
    .order("period_start", { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">Todos os relatórios da agência.</p>
      </div>

      {!reports || reports.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum relatório gerado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {reports.map((r) => {
            const client = Array.isArray(r.client) ? r.client[0] : r.client;
            return (
              <Link key={r.id} href={`/clients/${client?.id}/reports/${r.id}`}>
                <Card className="p-4 hover:bg-accent transition-colors">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="font-semibold">{client?.company_name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {formatDate(r.period_start)} → {formatDate(r.period_end)}
                        {r.ad_spend ? ` · ${formatCurrency(r.ad_spend)}` : ""}
                        {r.leads ? ` · ${r.leads} leads` : ""}
                      </div>
                    </div>
                    <Badge variant={r.status === "published" || r.status === "sent" ? "success" : "secondary"}>
                      {r.status === "draft" ? "Rascunho" : r.status === "published" ? "Publicado" : "Enviado"}
                    </Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
