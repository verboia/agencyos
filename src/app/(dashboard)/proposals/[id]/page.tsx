import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { PROPOSAL_STATUS, APP_URL } from "@/lib/utils/constants";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { ProposalActions } from "@/components/proposals/proposal-actions";

export default async function ProposalDetails({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: proposal } = await supabase.from("proposals").select("*").eq("id", id).maybeSingle();
  if (!proposal) notFound();

  const cfg = PROPOSAL_STATUS[proposal.status as keyof typeof PROPOSAL_STATUS];
  const portalUrl = `${APP_URL}/portal/proposta/${proposal.public_token}`;
  const services = (proposal.proposed_services ?? []) as Array<{
    name: string;
    description?: string;
    price: number;
    price_type: string;
  }>;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/proposals">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{proposal.proposal_number}</h1>
              <Badge>{cfg?.label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {proposal.prospect_name}
              {proposal.prospect_company && ` · ${proposal.prospect_company}`}
            </p>
          </div>
        </div>
        <ProposalActions proposal={proposal} portalUrl={portalUrl} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">Mensal</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {proposal.total_monthly ? formatCurrency(proposal.total_monthly) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">Implementação</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {proposal.implementation_fee ? formatCurrency(proposal.implementation_fee) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">Validade</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {proposal.valid_until ? formatDate(proposal.valid_until) : "—"}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Serviços propostos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {services.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 rounded-md border border-border">
              <div>
                <div className="text-sm font-medium">{s.name}</div>
                {s.description && <div className="text-xs text-muted-foreground">{s.description}</div>}
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(s.price)}</div>
                <div className="text-xs text-muted-foreground">
                  {s.price_type === "monthly" ? "/mês" : "único"}
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {proposal.introduction && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Introdução</CardTitle>
          </CardHeader>
          <CardContent className="text-sm whitespace-pre-wrap">{proposal.introduction}</CardContent>
        </Card>
      )}
    </div>
  );
}
