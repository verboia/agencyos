import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, FileText } from "lucide-react";
import { PROPOSAL_STATUS } from "@/lib/utils/constants";
import { formatCurrency, formatDate } from "@/lib/utils/format";

export default async function ProposalsPage() {
  const supabase = await createServerClient();
  const { data: proposals } = await supabase
    .from("proposals")
    .select("*")
    .order("created_at", { ascending: false });

  const byStatus = (status: string) => proposals?.filter((p) => p.status === status) ?? [];
  const conversion = proposals && proposals.length > 0
    ? (byStatus("accepted").length + byStatus("converted").length) / proposals.length
    : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Propostas</h1>
          <p className="text-sm text-muted-foreground">
            {proposals?.length ?? 0} proposta(s) · {(conversion * 100).toFixed(0)}% conversão
          </p>
        </div>
        <Button asChild>
          <Link href="/proposals/new">
            <Plus className="h-4 w-4" /> Nova proposta
          </Link>
        </Button>
      </div>

      {!proposals || proposals.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <FileText className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhuma proposta criada ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {proposals.map((p) => {
            const cfg = PROPOSAL_STATUS[p.status as keyof typeof PROPOSAL_STATUS];
            return (
              <Link key={p.id} href={`/proposals/${p.id}`}>
                <Card className="p-4 hover:bg-accent transition-colors">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{p.proposal_number}</span>
                        <Badge>{cfg?.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {p.prospect_name}
                        {p.prospect_company && ` · ${p.prospect_company}`}
                        {p.total_monthly && ` · ${formatCurrency(p.total_monthly)}/mês`}
                      </div>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {p.valid_until && `Válida até ${formatDate(p.valid_until)}`}
                    </div>
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
