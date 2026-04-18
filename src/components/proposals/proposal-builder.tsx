"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency } from "@/lib/utils/format";
import { maskPhone } from "@/lib/utils/validators";
import { createProposal } from "@/app/(dashboard)/proposals/actions";
import type { ServiceCatalog } from "@/types/database";
import { Plus, Trash2 } from "lucide-react";

export function ProposalBuilder({ services }: { services: ServiceCatalog[] }) {
  const [title, setTitle] = useState("Proposta de Máquina de Vendas");
  const [prospect, setProspect] = useState({ name: "", company: "", email: "", phone: "" });
  const [intro, setIntro] = useState("");
  const [problem, setProblem] = useState("");
  const [solution, setSolution] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [prices, setPrices] = useState<Record<string, number>>(
    Object.fromEntries(services.map((s) => [s.id, Number(s.base_price)]))
  );
  const [cases, setCases] = useState<Array<{ client_name: string; result: string; testimonial?: string }>>([]);
  const [hasImpl, setHasImpl] = useState(false);
  const [implFee, setImplFee] = useState(2500);
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [conditions, setConditions] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedServices = services.filter((s) => selected[s.id]);
  const monthly = selectedServices
    .filter((s) => s.price_type === "monthly")
    .reduce((sum, s) => sum + (prices[s.id] ?? 0), 0);

  async function submit() {
    if (!prospect.name) {
      setError("Nome do prospect é obrigatório");
      return;
    }
    if (selectedServices.length === 0) {
      setError("Selecione ao menos um serviço");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await createProposal({
      title,
      prospect_name: prospect.name,
      prospect_company: prospect.company,
      prospect_email: prospect.email,
      prospect_phone: prospect.phone,
      introduction: intro,
      problem_statement: problem,
      solution_description: solution,
      proposed_services: selectedServices.map((s) => ({
        service_id: s.id,
        name: s.name,
        description: s.description ?? undefined,
        price: prices[s.id] ?? Number(s.base_price),
        price_type: s.price_type,
      })),
      case_studies: cases,
      has_implementation: hasImpl,
      implementation_fee: hasImpl ? implFee : null,
      valid_until: validUntil,
      special_conditions: conditions,
    });
    if (result && "error" in result && result.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Proposta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Título</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Validade</Label>
              <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados do prospect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nome *</Label>
                <Input value={prospect.name} onChange={(e) => setProspect({ ...prospect, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Empresa</Label>
                <Input
                  value={prospect.company}
                  onChange={(e) => setProspect({ ...prospect, company: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail</Label>
                <Input
                  type="email"
                  value={prospect.email}
                  onChange={(e) => setProspect({ ...prospect, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input
                  value={prospect.phone}
                  onChange={(e) => setProspect({ ...prospect, phone: maskPhone(e.target.value) })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Narrativa</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Introdução</Label>
              <Textarea
                rows={3}
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="Olá [Nome], preparei essa proposta especialmente…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Diagnóstico (problema identificado)</Label>
              <Textarea rows={3} value={problem} onChange={(e) => setProblem(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Nossa solução</Label>
              <Textarea rows={3} value={solution} onChange={(e) => setSolution(e.target.value)} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Serviços</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {services.map((s) => (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-3 rounded-md border ${selected[s.id] ? "border-primary bg-primary/5" : "border-border"}`}
              >
                <Checkbox
                  checked={!!selected[s.id]}
                  onCheckedChange={(v) => setSelected((prev) => ({ ...prev, [s.id]: !!v }))}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{s.name}</div>
                </div>
                <div className="w-36">
                  <Input
                    type="number"
                    step="0.01"
                    value={prices[s.id] ?? Number(s.base_price)}
                    onChange={(e) => setPrices({ ...prices, [s.id]: Number(e.target.value) })}
                    disabled={!selected[s.id]}
                    className="text-right"
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cases / Resultados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cases.map((c, idx) => (
              <div key={idx} className="space-y-2 border border-border rounded-md p-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Case #{idx + 1}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setCases((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <Input
                  placeholder="Nome do cliente"
                  value={c.client_name}
                  onChange={(e) =>
                    setCases((prev) => prev.map((x, i) => (i === idx ? { ...x, client_name: e.target.value } : x)))
                  }
                />
                <Textarea
                  rows={2}
                  placeholder="Resultado obtido (números reais)"
                  value={c.result}
                  onChange={(e) =>
                    setCases((prev) => prev.map((x, i) => (i === idx ? { ...x, result: e.target.value } : x)))
                  }
                />
              </div>
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setCases((prev) => [...prev, { client_name: "", result: "" }])}
            >
              <Plus className="h-4 w-4" /> Adicionar case
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Implementação e condições</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={hasImpl} onCheckedChange={setHasImpl} />
              <Label>Inclui implementação</Label>
            </div>
            {hasImpl && (
              <div className="space-y-1.5">
                <Label>Valor da implementação</Label>
                <Input type="number" value={implFee} onChange={(e) => setImplFee(Number(e.target.value))} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Condições especiais</Label>
              <Textarea
                rows={3}
                value={conditions}
                onChange={(e) => setConditions(e.target.value)}
                placeholder="Descontos, bônus, prazos especiais…"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="text-base">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">Mensal proposto</div>
              <div className="text-2xl font-semibold">{formatCurrency(monthly)}</div>
            </div>
            {hasImpl && (
              <div>
                <div className="text-xs text-muted-foreground">Implementação</div>
                <div className="text-lg font-semibold">{formatCurrency(implFee)}</div>
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button className="w-full" onClick={submit} disabled={loading}>
              {loading ? "Criando…" : "Criar proposta"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
