"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { acceptContract, markContractViewed } from "@/app/portal/[token]/contract/actions";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { maskCEP, maskDocument, isValidDocument, isValidCEP } from "@/lib/utils/validators";
import { fetchCep } from "@/lib/services/viacep";
import { buildContractClauses } from "@/lib/services/contract-builder";
import { ArrowRight, ArrowLeft, Loader2, CheckCircle2, Download } from "lucide-react";
import type { Contract, ContractService } from "@/types/database";

interface Props {
  token: string;
  contract: Contract;
  services: ContractService[];
}

export function ContractAcceptFlow({ token, contract, services }: Props) {
  const [step, setStep] = useState<"view" | "data" | "sign" | "done">(
    contract.status === "signed" ? "done" : "view"
  );
  const [documentType, setDocumentType] = useState<"cpf" | "cnpj">(contract.document_type ?? "cnpj");
  const [form, setForm] = useState({
    legal_name: contract.legal_name ?? "",
    document_number: contract.document_number ?? "",
    address_street: contract.address_street ?? "",
    address_number: contract.address_number ?? "",
    address_complement: contract.address_complement ?? "",
    address_neighborhood: contract.address_neighborhood ?? "",
    address_city: contract.address_city ?? "",
    address_state: contract.address_state ?? "",
    address_zip: contract.address_zip ?? "",
  });
  const [signName, setSignName] = useState("");
  const [signDoc, setSignDoc] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (contract.status !== "signed") {
      markContractViewed(token, contract.id).catch(() => null);
    }
  }, [token, contract.id, contract.status]);

  async function onCepBlur() {
    if (!isValidCEP(form.address_zip)) return;
    const info = await fetchCep(form.address_zip);
    if (info) {
      setForm((f) => ({
        ...f,
        address_street: info.logradouro || f.address_street,
        address_neighborhood: info.bairro || f.address_neighborhood,
        address_city: info.localidade || f.address_city,
        address_state: info.uf || f.address_state,
      }));
    }
  }

  async function submit() {
    if (!consent) {
      toast({ title: "É preciso concordar com os termos", variant: "destructive" });
      return;
    }
    if (!isValidDocument(signDoc)) {
      toast({ title: "Documento inválido", variant: "destructive" });
      return;
    }
    setLoading(true);
    const result = await acceptContract(token, contract.id, {
      ...form,
      document_type: documentType,
      signature_full_name: signName,
      signature_document_typed: signDoc.replace(/\D/g, ""),
    });
    if (result?.error) {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
      setLoading(false);
    } else {
      setStep("done");
      setLoading(false);
    }
  }

  const pdfHref = `/api/portal/${token}/contract/pdf`;

  if (step === "done") {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 text-center space-y-4">
        <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
        <h1 className="text-2xl font-semibold">Contrato assinado! 🎉</h1>
        <p className="text-sm text-slate-600">
          Obrigado por formalizar a parceria. Agora nosso time inicia o setup da sua operação.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
          <Button asChild variant="outline">
            <a href={pdfHref} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" /> Baixar contrato em PDF
            </a>
          </Button>
          <Button asChild className="bg-adria hover:bg-adria/90">
            <a href={`/portal/${token}/briefing`}>Continuar para o briefing</a>
          </Button>
        </div>
      </div>
    );
  }

  const monthly = services.filter((s) => s.price_type === "monthly").reduce((sum, s) => sum + Number(s.price) * (s.quantity || 1), 0);

  if (step === "view") {
    const clauses = buildContractClauses({
      late_fee_percentage: Number(contract.late_fee_percentage),
      late_interest_monthly: Number(contract.late_interest_monthly),
      contract_months: contract.contract_months,
      auto_renew: contract.auto_renew,
      cancellation_fee_percentage: Number(contract.cancellation_fee_percentage),
      cancellation_notice_days: contract.cancellation_notice_days,
      services: services.map((s) => ({ clauses: s.clauses ?? [] })),
      custom: contract.custom_clauses ?? [],
    });

    return (
      <div className="space-y-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="text-xs text-slate-500">Contrato</div>
          <h1 className="text-2xl font-semibold">{contract.contract_number}</h1>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
          <h2 className="font-semibold">Contratante / Contratada</h2>
          <div className="text-sm text-slate-600">
            Contratada: <strong>{contract.contractor_legal_name}</strong>
          </div>
          <div className="text-sm text-slate-600">
            Vigência: {contract.contract_months} meses
            {contract.start_date && ` · Início ${formatDate(contract.start_date)}`}
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-3">
          <h2 className="font-semibold">Serviços contratados</h2>
          {services.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
              <div>
                <div className="font-medium">{s.service_name}</div>
                {s.service_description && <div className="text-xs text-slate-500">{s.service_description}</div>}
              </div>
              <div className="text-right">
                <div className="font-semibold">{formatCurrency(Number(s.price))}</div>
                <div className="text-xs text-slate-500">{s.price_type === "monthly" ? "/mês" : "único"}</div>
              </div>
            </div>
          ))}
          {contract.has_implementation && (
            <div className="pt-2 border-t border-slate-100">
              <div className="text-sm font-medium">Implementação</div>
              <div className="text-xs text-slate-500">{contract.implementation_description}</div>
              <div className="text-right text-sm font-semibold mt-1">
                {formatCurrency(Number(contract.implementation_fee ?? 0))}
              </div>
            </div>
          )}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <span className="font-semibold">Total mensal</span>
            <span className="text-xl font-bold text-adria">{formatCurrency(monthly)}</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4 text-sm">
          <h2 className="font-semibold">Cláusulas</h2>
          {clauses.map((c, idx) => (
            <div key={idx} className="space-y-1">
              <div className="font-medium text-slate-800">{c.title}</div>
              <p className="text-slate-600 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button asChild variant="outline" className="sm:w-auto">
            <a href={pdfHref} target="_blank" rel="noopener noreferrer">
              <Download className="h-4 w-4" /> Baixar contrato em PDF
            </a>
          </Button>
          <Button className="flex-1 bg-adria hover:bg-adria/90" onClick={() => setStep("data")}>
            Prosseguir para aceite <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  if (step === "data") {
    return (
      <div className="space-y-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h1 className="text-xl font-semibold">Dados do contratante</h1>
          <p className="text-sm text-slate-500 mt-1">Preencha os dados que constarão no contrato.</p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-3">
          <div className="flex gap-2">
            <button
              className={`px-3 py-1.5 rounded-md text-sm ${documentType === "cnpj" ? "bg-adria text-white" : "bg-slate-100"}`}
              onClick={() => setDocumentType("cnpj")}
            >
              CNPJ
            </button>
            <button
              className={`px-3 py-1.5 rounded-md text-sm ${documentType === "cpf" ? "bg-adria text-white" : "bg-slate-100"}`}
              onClick={() => setDocumentType("cpf")}
            >
              CPF
            </button>
          </div>
          <div className="space-y-1.5">
            <Label>{documentType === "cnpj" ? "Razão social" : "Nome completo"} *</Label>
            <Input
              value={form.legal_name}
              onChange={(e) => setForm({ ...form, legal_name: e.target.value })}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>{documentType === "cnpj" ? "CNPJ" : "CPF"} *</Label>
            <Input
              value={form.document_number}
              onChange={(e) => setForm({ ...form, document_number: maskDocument(e.target.value) })}
              placeholder={documentType === "cnpj" ? "00.000.000/0001-00" : "000.000.000-00"}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>CEP *</Label>
              <Input
                value={form.address_zip}
                onChange={(e) => setForm({ ...form, address_zip: maskCEP(e.target.value) })}
                onBlur={onCepBlur}
                placeholder="00000-000"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Logradouro *</Label>
            <Input
              value={form.address_street}
              onChange={(e) => setForm({ ...form, address_street: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Número *</Label>
              <Input
                value={form.address_number}
                onChange={(e) => setForm({ ...form, address_number: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Complemento</Label>
              <Input
                value={form.address_complement}
                onChange={(e) => setForm({ ...form, address_complement: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Bairro *</Label>
            <Input
              value={form.address_neighborhood}
              onChange={(e) => setForm({ ...form, address_neighborhood: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5 col-span-2">
              <Label>Cidade *</Label>
              <Input
                value={form.address_city}
                onChange={(e) => setForm({ ...form, address_city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>UF *</Label>
              <Input
                value={form.address_state}
                onChange={(e) => setForm({ ...form, address_state: e.target.value.toUpperCase().slice(0, 2) })}
              />
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setStep("view")}>
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <Button
            className="flex-1 bg-adria hover:bg-adria/90"
            onClick={() => setStep("sign")}
            disabled={!form.legal_name || !form.document_number || !form.address_zip || !form.address_street}
          >
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h1 className="text-xl font-semibold">Aceite digital</h1>
        <p className="text-sm text-slate-500 mt-1">Confirme seus dados e assine eletronicamente.</p>
      </div>
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-3">
        <div className="space-y-1.5">
          <Label>Seu nome completo</Label>
          <Input value={signName} onChange={(e) => setSignName(e.target.value)} placeholder="Assine digitando seu nome" />
        </div>
        <div className="space-y-1.5">
          <Label>CPF ou CNPJ (para conferência)</Label>
          <Input value={signDoc} onChange={(e) => setSignDoc(maskDocument(e.target.value))} />
        </div>
        <label className="flex items-start gap-2 pt-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="h-4 w-4 mt-0.5"
          />
          <span className="text-xs text-slate-600">
            Li e concordo com todos os termos deste contrato. Ao clicar em &quot;Assinar Contrato&quot;, você concorda
            eletronicamente com todos os termos acima. Este aceite tem validade jurídica conforme Art. 107 do Código Civil
            e MP 2.200-2/2001.
          </span>
        </label>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={() => setStep("data")} disabled={loading}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        <Button
          className="flex-1 bg-adria hover:bg-adria/90"
          onClick={submit}
          disabled={loading || !signName || !consent}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Assinar contrato ✓"}
        </Button>
      </div>
    </div>
  );
}
