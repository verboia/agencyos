import { notFound } from "next/navigation";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send, FileText } from "lucide-react";
import { CONTRACT_STATUS, APP_URL } from "@/lib/utils/constants";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils/format";
import { ContractActions } from "@/components/contracts/contract-actions";

export default async function ContractDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();

  const [{ data: contract }, { data: services }, { data: events }] = await Promise.all([
    supabase
      .from("contracts")
      .select("*, client:clients(id, company_name, public_token)")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("contract_services").select("*").eq("contract_id", id).order("sort_order"),
    supabase.from("contract_events").select("*").eq("contract_id", id).order("created_at"),
  ]);

  if (!contract) notFound();

  const client = Array.isArray(contract.client) ? contract.client[0] : contract.client;
  const portalUrl = client?.public_token ? `${APP_URL}/portal/${client.public_token}/contract` : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/contracts">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{contract.contract_number}</h1>
              <Badge>{CONTRACT_STATUS[contract.status as keyof typeof CONTRACT_STATUS]?.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{client?.company_name}</p>
          </div>
        </div>
        <ContractActions contract={contract} portalUrl={portalUrl} />
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground">Mensalidade</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {contract.total_monthly_value ? formatCurrency(contract.total_monthly_value) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground">Implementação</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {contract.implementation_fee ? formatCurrency(contract.implementation_fee) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground">Vigência</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{contract.contract_months} meses</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground">Início</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {contract.start_date ? formatDate(contract.start_date) : "—"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Serviços contratados</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {services?.map((s) => (
            <div key={s.id} className="flex items-center justify-between p-3 rounded-md border border-border">
              <div>
                <div className="text-sm font-medium">{s.service_name}</div>
                <div className="text-xs text-muted-foreground capitalize">
                  {s.price_type === "monthly" ? "Mensal" : "Único"}
                </div>
              </div>
              <div className="font-semibold">{formatCurrency(s.price * (s.quantity || 1))}</div>
            </div>
          ))}
        </CardContent>
      </Card>

      {contract.has_implementation && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Implementação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="font-semibold">{formatCurrency(contract.implementation_fee ?? 0)}</div>
            <p className="text-muted-foreground">{contract.implementation_description}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico</CardTitle>
        </CardHeader>
        <CardContent>
          {!events || events.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem eventos.</p>
          ) : (
            <ol className="space-y-3">
              {events.map((e) => (
                <li key={e.id} className="flex items-start gap-3 text-sm">
                  <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1">
                    <div>{e.description}</div>
                    <div className="text-xs text-muted-foreground">{formatDateTime(e.created_at)}</div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {contract.signature_full_name && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assinatura digital</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            <div><span className="text-muted-foreground">Nome: </span>{contract.signature_full_name}</div>
            <div><span className="text-muted-foreground">Documento: </span>{contract.signature_document_typed}</div>
            <div><span className="text-muted-foreground">IP: </span>{contract.signature_ip}</div>
            <div><span className="text-muted-foreground">Data/hora: </span>{contract.signed_at ? formatDateTime(contract.signed_at) : "—"}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
