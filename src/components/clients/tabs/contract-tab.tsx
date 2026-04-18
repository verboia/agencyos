import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";
import { CONTRACT_STATUS } from "@/lib/utils/constants";
import { formatCurrency, formatDateTime } from "@/lib/utils/format";
import Link from "next/link";
import { FileSignature } from "lucide-react";

export async function ClientContractTab({ clientId }: { clientId: string }) {
  const supabase = await createServerClient();
  const { data: contracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  if (!contracts || contracts.length === 0) {
    return (
      <Card>
        <CardContent className="p-10 text-center space-y-3">
          <FileSignature className="h-10 w-10 mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Este cliente ainda não possui contrato.</p>
          <Button asChild>
            <Link href={`/contracts/new?client_id=${clientId}`}>Montar contrato</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {contracts.map((c) => (
        <Link key={c.id} href={`/contracts/${c.id}`}>
          <Card className="p-4 hover:bg-accent transition-colors">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{c.contract_number}</span>
                  <Badge>{CONTRACT_STATUS[c.status as keyof typeof CONTRACT_STATUS]?.label ?? c.status}</Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {c.total_monthly_value ? formatCurrency(c.total_monthly_value) + "/mês" : "Sem valores"}
                  {c.sent_at && ` · Enviado em ${formatDateTime(c.sent_at)}`}
                </div>
              </div>
              <Button variant="outline" size="sm">Abrir</Button>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}
