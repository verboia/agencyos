"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatCurrency, formatDocument, formatCEP } from "@/lib/utils/format";
import { createContract } from "@/app/(dashboard)/contracts/actions";
import { fetchCep } from "@/lib/services/viacep";
import type { ServiceCatalog, ServicePackage } from "@/types/database";
import type { ContractClause } from "@/lib/utils/contract-clauses";

interface Props {
  clients: Array<{ id: string; company_name: string }>;
  services: ServiceCatalog[];
  packages: ServicePackage[];
  defaultClientId?: string;
}

interface SelectedService {
  service_id: string;
  service_name: string;
  service_description: string;
  service_category: string;
  price: number;
  price_type: string;
  quantity: number;
  clauses: ContractClause[];
  selected: boolean;
}

export function ContractBuilder({ clients, services, packages, defaultClientId }: Props) {
  const [clientId, setClientId] = useState(defaultClientId ?? "");
  const [selected, setSelected] = useState<SelectedService[]>(
    services.map((s) => ({
      service_id: s.id,
      service_name: s.name,
      service_description: s.description ?? "",
      service_category: s.category,
      price: Number(s.base_price),
      price_type: s.price_type,
      quantity: 1,
      clauses: s.contract_clauses ?? [],
      selected: false,
    }))
  );
  const [contractMonths, setContractMonths] = useState(12);
  const [paymentDueDay, setPaymentDueDay] = useState(10);
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [autoRenew, setAutoRenew] = useState(true);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [hasImplementation, setHasImplementation] = useState(false);
  const [implementationFee, setImplementationFee] = useState(2500);
  const [implementationDescription, setImplementationDescription] = useState(
    "Setup de conta, pixel, campanhas iniciais, configuração do CRM e SDR de IA."
  );
  const [lateFee, setLateFee] = useState(2);
  const [lateInterest, setLateInterest] = useState(1);
  const [cancellationFee, setCancellationFee] = useState(20);
  const [noticeDays, setNoticeDays] = useState(30);
  const [customClauses, setCustomClauses] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePackage, setActivePackage] = useState<ServicePackage | null>(null);

  const [legalName, setLegalName] = useState("");
  const [documentType, setDocumentType] = useState<"cnpj" | "cpf">("cnpj");
  const [documentNumber, setDocumentNumber] = useState("");
  const [addressZip, setAddressZip] = useState("");
  const [addressStreet, setAddressStreet] = useState("");
  const [addressNumber, setAddressNumber] = useState("");
  const [addressComplement, setAddressComplement] = useState("");
  const [addressNeighborhood, setAddressNeighborhood] = useState("");
  const [addressCity, setAddressCity] = useState("");
  const [addressState, setAddressState] = useState("");
  const [repName, setRepName] = useState("");
  const [repNationality, setRepNationality] = useState("brasileiro(a)");
  const [repMaritalStatus, setRepMaritalStatus] = useState("");
  const [repProfession, setRepProfession] = useState("");
  const [repRg, setRepRg] = useState("");
  const [repCpf, setRepCpf] = useState("");
  const [repEmail, setRepEmail] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  async function handleCepBlur() {
    if (!addressZip || addressZip.replace(/\D/g, "").length !== 8) return;
    setCepLoading(true);
    const data = await fetchCep(addressZip);
    if (data) {
      if (!addressStreet) setAddressStreet(data.logradouro);
      if (!addressNeighborhood) setAddressNeighborhood(data.bairro);
      if (!addressCity) setAddressCity(data.localidade);
      if (!addressState) setAddressState(data.uf);
    }
    setCepLoading(false);
  }

  const selectedServices = selected.filter((s) => s.selected);
  const monthly = useMemo(
    () => selectedServices.filter((s) => s.price_type === "monthly").reduce((sum, s) => sum + s.price * s.quantity, 0),
    [selectedServices]
  );
  const oneTime = useMemo(
    () => selectedServices.filter((s) => s.price_type === "one_time").reduce((sum, s) => sum + s.price * s.quantity, 0),
    [selectedServices]
  );

  function applyPackage(packageId: string) {
    const pkg = packages.find((p) => p.id === packageId);
    if (!pkg) return;
    const ids = (pkg.included_services as Array<{ service_id: string; custom_price: number | null }>).map((s) => s.service_id);
    const pkgPrice = Number(pkg.package_price);

    // Distribui o valor fechado do pacote proporcionalmente ao preço base dos serviços mensais
    const monthlyIncluded = selected.filter((s) => ids.includes(s.service_id) && s.price_type === "monthly");
    const baseSum = monthlyIncluded.reduce((sum, s) => sum + s.price, 0);

    setSelected((prev) =>
      prev.map((s) => {
        const included = ids.includes(s.service_id);
        if (!included) return { ...s, selected: false };
        if (s.price_type === "monthly" && baseSum > 0) {
          const share = (s.price / baseSum) * pkgPrice;
          return { ...s, selected: true, price: Math.round(share * 100) / 100 };
        }
        return { ...s, selected: true };
      })
    );
    setActivePackage(pkg);
  }

  function clearPackage() {
    // Restaura preços base e limpa seleção
    setSelected(
      services.map((s) => ({
        service_id: s.id,
        service_name: s.name,
        service_description: s.description ?? "",
        service_category: s.category,
        price: Number(s.base_price),
        price_type: s.price_type,
        quantity: 1,
        clauses: s.contract_clauses ?? [],
        selected: false,
      }))
    );
    setActivePackage(null);
  }

  function toggleService(serviceId: string) {
    if (activePackage) setActivePackage(null);
    setSelected((prev) => prev.map((s) => (s.service_id === serviceId ? { ...s, selected: !s.selected } : s)));
  }

  function updatePrice(serviceId: string, value: number) {
    if (activePackage) setActivePackage(null);
    setSelected((prev) => prev.map((s) => (s.service_id === serviceId ? { ...s, price: value } : s)));
  }

  async function handleSubmit() {
    if (!clientId) {
      setError("Selecione um cliente");
      return;
    }
    if (selectedServices.length === 0) {
      setError("Selecione ao menos um serviço");
      return;
    }

    setLoading(true);
    setError(null);

    const customClausesParsed: ContractClause[] = customClauses
      .split(/\n{2,}/)
      .map((block) => block.trim())
      .filter(Boolean)
      .map((body, idx) => ({ title: `CLÁUSULA ADICIONAL — ${idx + 1}`, body, order: 900 + idx }));

    const result = await createContract({
      client_id: clientId,
      services: selectedServices.map(({ selected: _sel, ...s }) => s),
      has_implementation: hasImplementation,
      implementation_fee: hasImplementation ? implementationFee : null,
      implementation_description: hasImplementation ? implementationDescription : null,
      contract_months: contractMonths,
      payment_due_day: paymentDueDay,
      payment_method: paymentMethod,
      auto_renew: autoRenew,
      start_date: startDate,
      custom_clauses: customClausesParsed,
      internal_notes: internalNotes || null,
      late_fee_percentage: lateFee,
      late_interest_monthly: lateInterest,
      cancellation_fee_percentage: cancellationFee,
      cancellation_notice_days: noticeDays,
      legal_name: legalName || null,
      document_type: documentType,
      document_number: documentNumber || null,
      address_street: addressStreet || null,
      address_number: addressNumber || null,
      address_complement: addressComplement || null,
      address_neighborhood: addressNeighborhood || null,
      address_city: addressCity || null,
      address_state: addressState || null,
      address_zip: addressZip || null,
      representative_name: repName || null,
      representative_nationality: repNationality || null,
      representative_marital_status: repMaritalStatus || null,
      representative_profession: repProfession || null,
      representative_rg: repRg || null,
      representative_cpf: repCpf || null,
      representative_email: repEmail || null,
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
            <CardTitle className="text-base">Cliente e pacote</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={clientId} onValueChange={setClientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.company_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {packages.length > 0 && (
              <div className="space-y-1.5">
                <Label>Pacote rápido (opcional)</Label>
                <Select onValueChange={applyPackage}>
                  <SelectTrigger>
                    <SelectValue placeholder="Aplicar pacote" />
                  </SelectTrigger>
                  <SelectContent>
                    {packages.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} · {formatCurrency(p.package_price)}/mês
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados jurídicos da CONTRATANTE</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2 space-y-1.5">
                <Label>Razão social / nome completo</Label>
                <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Tipo</Label>
                <Select value={documentType} onValueChange={(v) => setDocumentType(v as "cnpj" | "cpf")}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cnpj">CNPJ (PJ)</SelectItem>
                    <SelectItem value="cpf">CPF (PF)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>{documentType === "cnpj" ? "CNPJ" : "CPF"}</Label>
              <Input
                value={documentNumber}
                onChange={(e) => setDocumentNumber(formatDocument(e.target.value))}
                placeholder={documentType === "cnpj" ? "00.000.000/0000-00" : "000.000.000-00"}
                maxLength={documentType === "cnpj" ? 18 : 14}
                inputMode="numeric"
              />
            </div>

            <div className="pt-2">
              <div className="text-sm font-medium mb-2">Endereço</div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1.5">
                  <Label>CEP</Label>
                  <Input
                    value={addressZip}
                    onChange={(e) => setAddressZip(formatCEP(e.target.value))}
                    onBlur={handleCepBlur}
                    placeholder="00000-000"
                    maxLength={9}
                    inputMode="numeric"
                  />
                  {cepLoading && <span className="text-xs text-muted-foreground">Buscando…</span>}
                </div>
                <div className="md:col-span-3 space-y-1.5">
                  <Label>Logradouro</Label>
                  <Input value={addressStreet} onChange={(e) => setAddressStreet(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Número</Label>
                  <Input value={addressNumber} onChange={(e) => setAddressNumber(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Complemento</Label>
                  <Input value={addressComplement} onChange={(e) => setAddressComplement(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Bairro</Label>
                  <Input value={addressNeighborhood} onChange={(e) => setAddressNeighborhood(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>UF</Label>
                  <Input value={addressState} onChange={(e) => setAddressState(e.target.value)} maxLength={2} />
                </div>
                <div className="md:col-span-3 space-y-1.5">
                  <Label>Cidade</Label>
                  <Input value={addressCity} onChange={(e) => setAddressCity(e.target.value)} />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <div className="text-sm font-medium mb-2">Representante legal</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Nome completo</Label>
                  <Input value={repName} onChange={(e) => setRepName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>E-mail oficial</Label>
                  <Input
                    type="email"
                    value={repEmail}
                    onChange={(e) => setRepEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Nacionalidade</Label>
                  <Input value={repNationality} onChange={(e) => setRepNationality(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Estado civil</Label>
                  <Input
                    value={repMaritalStatus}
                    onChange={(e) => setRepMaritalStatus(e.target.value)}
                    placeholder="solteiro(a), casado(a)…"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Profissão</Label>
                  <Input value={repProfession} onChange={(e) => setRepProfession(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>
                    RG + órgão emissor <span className="text-muted-foreground font-normal">(opcional)</span>
                  </Label>
                  <Input
                    value={repRg}
                    onChange={(e) => setRepRg(e.target.value)}
                    placeholder="0.000.000 SSP/MS — deixe em branco se não informado"
                  />
                </div>
                <div className="md:col-span-2 space-y-1.5">
                  <Label>CPF do representante</Label>
                  <Input
                    value={repCpf}
                    onChange={(e) => setRepCpf(formatDocument(e.target.value))}
                    placeholder="000.000.000-00"
                    maxLength={14}
                    inputMode="numeric"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {activePackage ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pacote contratado</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between gap-4 p-3 rounded-md border border-primary bg-primary/5">
                <div className="min-w-0">
                  <div className="font-semibold">{activePackage.name}</div>
                  {activePackage.description && (
                    <div className="text-xs text-muted-foreground">{activePackage.description}</div>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <div className="text-lg font-semibold">{formatCurrency(Number(activePackage.package_price))}</div>
                  <div className="text-xs text-muted-foreground">/mês</div>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">O que está incluso</div>
                <ul className="space-y-1 text-sm">
                  {selected
                    .filter((s) => s.selected)
                    .map((s) => (
                      <li key={s.service_id} className="flex items-center gap-2">
                        <span className="text-primary">✓</span>
                        <span>{s.service_name}</span>
                        <span className="text-xs text-muted-foreground">
                          ({s.price_type === "monthly" ? "mensal" : s.price_type === "one_time" ? "único" : "por unidade"})
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
              <p className="text-xs text-muted-foreground">
                O pacote é um valor fechado. Os serviços acima só podem ser contratados em conjunto — o cliente não
                paga por serviços avulsos deste pacote.
              </p>
              <Button variant="outline" size="sm" onClick={clearPackage}>
                Personalizar (à la carte)
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Serviços avulsos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Selecione apenas se o cliente está contratando serviços fora de um pacote. Para pacotes, use o
                seletor acima.
              </p>
              {selected.map((s) => (
                <div
                  key={s.service_id}
                  className={`flex items-center gap-3 p-3 rounded-md border ${s.selected ? "border-primary bg-primary/5" : "border-border"}`}
                >
                  <Checkbox checked={s.selected} onCheckedChange={() => toggleService(s.service_id)} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{s.service_name}</div>
                    <div className="text-xs text-muted-foreground">
                      {s.price_type === "monthly" ? "Mensal" : s.price_type === "one_time" ? "Único" : "Por unidade"}
                    </div>
                  </div>
                  <div className="w-36">
                    <Input
                      type="number"
                      step="0.01"
                      value={s.price}
                      onChange={(e) => updatePrice(s.service_id, Number(e.target.value))}
                      disabled={!s.selected}
                      className="text-right"
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Implementação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              <Switch checked={hasImplementation} onCheckedChange={setHasImplementation} />
              <Label>Inclui implementação</Label>
            </div>
            {hasImplementation && (
              <>
                <div className="space-y-1.5">
                  <Label>Valor</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={implementationFee}
                    onChange={(e) => setImplementationFee(Number(e.target.value))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Descrição</Label>
                  <Textarea
                    rows={3}
                    value={implementationDescription}
                    onChange={(e) => setImplementationDescription(e.target.value)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Termos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Prazo (meses)</Label>
                <Input
                  type="number"
                  value={contractMonths}
                  onChange={(e) => setContractMonths(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Dia venc.</Label>
                <Input type="number" min={1} max={28} value={paymentDueDay} onChange={(e) => setPaymentDueDay(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Pagamento</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="BOLETO">Boleto</SelectItem>
                    <SelectItem value="CREDIT_CARD">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Início</Label>
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={autoRenew} onCheckedChange={setAutoRenew} />
              <Label>Renovação automática</Label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Multa atraso (%)</Label>
                <Input type="number" step="0.01" value={lateFee} onChange={(e) => setLateFee(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Juros mensal (%)</Label>
                <Input type="number" step="0.01" value={lateInterest} onChange={(e) => setLateInterest(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Multa rescisão (%)</Label>
                <Input type="number" step="0.01" value={cancellationFee} onChange={(e) => setCancellationFee(Number(e.target.value))} />
              </div>
              <div className="space-y-1.5">
                <Label>Aviso prévio (d)</Label>
                <Input type="number" value={noticeDays} onChange={(e) => setNoticeDays(Number(e.target.value))} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cláusulas customizadas (opcional)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={4}
              placeholder="Uma cláusula por parágrafo. Separe com linha em branco."
              value={customClauses}
              onChange={(e) => setCustomClauses(e.target.value)}
            />
            <div className="space-y-1.5">
              <Label>Notas internas (não aparecem no contrato)</Label>
              <Textarea rows={2} value={internalNotes} onChange={(e) => setInternalNotes(e.target.value)} />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="sticky top-6">
          <CardHeader>
            <CardTitle className="text-base">Resumo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground">
                {activePackage ? activePackage.name : "Mensal"}
              </div>
              <div className="text-2xl font-semibold">{formatCurrency(monthly)}</div>
            </div>
            {hasImplementation && (
              <div>
                <div className="text-xs text-muted-foreground">Implementação</div>
                <div className="text-lg font-semibold">{formatCurrency(implementationFee)}</div>
              </div>
            )}
            {oneTime > 0 && (
              <div>
                <div className="text-xs text-muted-foreground">Serviços únicos</div>
                <div className="text-lg font-semibold">{formatCurrency(oneTime)}</div>
              </div>
            )}
            <div>
              <div className="text-xs text-muted-foreground">Vigência</div>
              <div className="text-sm">{contractMonths} meses</div>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <Button className="w-full" onClick={handleSubmit} disabled={loading}>
              {loading ? "Salvando…" : "Criar contrato"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
