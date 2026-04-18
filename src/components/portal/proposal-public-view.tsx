"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { acceptProposal, rejectProposal } from "@/app/(dashboard)/proposals/actions";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { CheckCircle2, MessageCircle, Loader2 } from "lucide-react";
import type { Proposal } from "@/types/database";

export function ProposalPublicView({ proposal, token }: { proposal: Proposal; token: string }) {
  const [step, setStep] = useState<"view" | "rejecting" | "accepted" | "rejected">(
    proposal.status === "accepted" || proposal.status === "converted" ? "accepted" :
    proposal.status === "rejected" ? "rejected" : "view"
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const services = (proposal.proposed_services ?? []) as Array<{
    name: string;
    description?: string;
    price: number;
    price_type: string;
  }>;

  async function accept() {
    setLoading(true);
    const result = await acceptProposal(token);
    if (result?.error) {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
      setLoading(false);
    } else {
      setStep("accepted");
      if (result.clientToken) {
        setRedirectUrl(`/portal/${result.clientToken}/contract`);
      }
    }
  }

  async function reject() {
    if (!reason) return;
    setLoading(true);
    const result = await rejectProposal(token, reason);
    if (result?.error) {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
    } else {
      setStep("rejected");
    }
    setLoading(false);
  }

  if (step === "accepted") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto" />
        <h1 className="text-3xl font-semibold">Proposta aceita! 🎉</h1>
        <p className="text-slate-600">
          Estamos felizes pela parceria. O próximo passo é assinar o contrato.
        </p>
        {redirectUrl && (
          <Button asChild className="bg-adria hover:bg-adria/90">
            <a href={redirectUrl}>Ir para o contrato</a>
          </Button>
        )}
      </div>
    );
  }

  if (step === "rejected") {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="text-2xl font-semibold">Resposta enviada</h1>
        <p className="text-slate-600">Obrigado pelo retorno. Caso queira retomar a conversa, é só chamar a equipe.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 md:py-16 space-y-8">
      <header className="text-center space-y-3">
        <div className="w-14 h-14 rounded-xl bg-adria mx-auto flex items-center justify-center text-white font-bold text-2xl">
          A
        </div>
        <div className="text-xs uppercase tracking-wider text-adria font-semibold">Adria · Proposta</div>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900">{proposal.title}</h1>
        <p className="text-slate-600">
          Olá, {proposal.prospect_name.split(" ")[0]}. Preparamos essa proposta especialmente
          {proposal.prospect_company ? ` para a ${proposal.prospect_company}` : ""}.
        </p>
      </header>

      {proposal.introduction && (
        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 animate-slide-up">
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{proposal.introduction}</p>
        </section>
      )}

      {proposal.problem_statement && (
        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">🎯 Diagnóstico</h2>
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{proposal.problem_statement}</p>
        </section>
      )}

      {proposal.solution_description && (
        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-3">💡 Nossa solução</h2>
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{proposal.solution_description}</p>
        </section>
      )}

      <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">📦 O que está incluso</h2>
        <div className="space-y-3">
          {services.map((s, idx) => (
            <div key={idx} className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 last:border-b-0">
              <div className="flex-1">
                <div className="font-medium text-slate-900">{s.name}</div>
                {s.description && <div className="text-sm text-slate-500 mt-0.5">{s.description}</div>}
              </div>
              <div className="text-right">
                <div className="font-semibold text-slate-900">{formatCurrency(s.price)}</div>
                <div className="text-xs text-slate-500">{s.price_type === "monthly" ? "/mês" : "único"}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 pt-6 border-t-2 border-slate-200 flex items-end justify-between">
          <span className="text-slate-600">Investimento mensal</span>
          <span className="text-3xl font-bold text-adria">{formatCurrency(proposal.total_monthly ?? 0)}</span>
        </div>
        {proposal.has_implementation && proposal.implementation_fee && (
          <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
            <span>+ Implementação (única)</span>
            <span>{formatCurrency(proposal.implementation_fee)}</span>
          </div>
        )}
      </section>

      {proposal.case_studies && (proposal.case_studies as Array<unknown>).length > 0 && (
        <section className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">🏆 Resultados de quem confia na gente</h2>
          <div className="space-y-3">
            {(proposal.case_studies as Array<{ client_name: string; result: string }>).map((c, idx) => (
              <div key={idx} className="bg-slate-50 rounded-lg p-4">
                <div className="font-semibold text-slate-900">{c.client_name}</div>
                <div className="text-sm text-slate-700 mt-1">{c.result}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {proposal.special_conditions && (
        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <h3 className="font-semibold text-amber-900">✨ Condição especial</h3>
          <p className="text-sm text-amber-900 mt-2 whitespace-pre-wrap">{proposal.special_conditions}</p>
        </section>
      )}

      {proposal.valid_until && (
        <p className="text-center text-xs text-slate-500">
          Esta proposta é válida até {formatDate(proposal.valid_until)}.
        </p>
      )}

      {step === "view" ? (
        <div className="sticky bottom-4 bg-white rounded-2xl p-4 shadow-lg border border-slate-200 flex flex-col md:flex-row gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setStep("rejecting")}
            disabled={loading}
          >
            <MessageCircle className="h-4 w-4" /> Tenho dúvidas
          </Button>
          <Button
            className="flex-1 bg-adria hover:bg-adria/90"
            onClick={accept}
            disabled={loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Aceitar proposta"}
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-3">
          <h3 className="font-semibold">Conta pra gente o que ficou em dúvida</h3>
          <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} />
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("view")} disabled={loading}>
              Voltar
            </Button>
            <Button onClick={reject} disabled={loading || !reason} className="flex-1">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
