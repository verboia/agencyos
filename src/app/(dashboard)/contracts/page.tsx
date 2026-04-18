import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CONTRACT_STATUS } from "@/lib/utils/constants";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { Plus, FileSignature } from "lucide-react";

export default async function ContractsPage() {
  const supabase = await createServerClient();
  const { data: contracts } = await supabase
    .from("contracts")
    .select("*, client:clients(company_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Contratos</h1>
          <p className="text-sm text-muted-foreground">{contracts?.length ?? 0} contrato(s)</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/contracts/catalog">Catálogo</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/contracts/packages">Pacotes</Link>
          </Button>
          <Button asChild>
            <Link href="/contracts/new">
              <Plus className="h-4 w-4" /> Novo contrato
            </Link>
          </Button>
        </div>
      </div>

      {!contracts || contracts.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-3">
            <FileSignature className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Nenhum contrato criado ainda.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {contracts.map((c) => {
            const clientName = Array.isArray(c.client)
              ? (c.client[0] as { company_name?: string } | undefined)?.company_name
              : (c.client as { company_name?: string } | null)?.company_name;
            return (
              <Link key={c.id} href={`/contracts/${c.id}`}>
                <Card className="p-4 hover:bg-accent transition-colors">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{c.contract_number}</span>
                        <Badge>{CONTRACT_STATUS[c.status as keyof typeof CONTRACT_STATUS]?.label}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {clientName} · {c.total_monthly_value ? formatCurrency(c.total_monthly_value) + "/mês" : ""}
                        {c.start_date && ` · Início ${formatDate(c.start_date)}`}
                      </div>
                    </div>
                    <Button variant="outline" size="sm">Abrir</Button>
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
