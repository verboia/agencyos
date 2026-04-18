"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { saveBriefing } from "@/app/portal/[token]/briefing/actions";
import { useToast } from "@/components/ui/use-toast";
import type { ClientBriefing } from "@/types/database";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";

interface Props {
  token: string;
  briefing: ClientBriefing | null;
}

const STEPS = [
  { title: "Sobre o seu negócio", emoji: "🏢" },
  { title: "Marketing atual", emoji: "📱" },
  { title: "Objetivos", emoji: "🎯" },
  { title: "Marca e materiais", emoji: "🎨" },
  { title: "Acessos", emoji: "🔐" },
  { title: "Informações finais", emoji: "✏️" },
];

export function BriefingForm({ token, briefing }: Props) {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<Record<string, unknown>>({
    business_description: briefing?.business_description ?? "",
    target_audience: briefing?.target_audience ?? "",
    main_products_services: briefing?.main_products_services ?? "",
    differentials: briefing?.differentials ?? "",
    average_ticket: briefing?.average_ticket ?? "",
    monthly_revenue_range: briefing?.monthly_revenue_range ?? "",
    has_website: briefing?.has_website ?? false,
    website_url: briefing?.website_url ?? "",
    has_instagram: briefing?.has_instagram ?? false,
    instagram_handle: briefing?.instagram_handle ?? "",
    has_google_business: briefing?.has_google_business ?? false,
    current_ads_investment: briefing?.current_ads_investment ?? "",
    previous_agency_experience: briefing?.previous_agency_experience ?? "",
    main_goal: briefing?.main_goal ?? "",
    monthly_lead_goal: briefing?.monthly_lead_goal ?? "",
    monthly_revenue_goal: briefing?.monthly_revenue_goal ?? "",
    has_brand_guide: briefing?.has_brand_guide ?? false,
    brand_colors: briefing?.brand_colors ?? "",
    brand_fonts: briefing?.brand_fonts ?? "",
    meta_business_manager_access: briefing?.meta_business_manager_access ?? "",
    google_ads_access: briefing?.google_ads_access ?? "",
    competitors: briefing?.competitors ?? "",
    seasonal_periods: briefing?.seasonal_periods ?? "",
    restrictions: briefing?.restrictions ?? "",
    additional_notes: briefing?.additional_notes ?? "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  function update(field: string, value: unknown) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave(complete: boolean) {
    setLoading(true);
    const cleaned = { ...data };
    for (const k of ["average_ticket", "current_ads_investment", "monthly_lead_goal", "monthly_revenue_goal"]) {
      if (cleaned[k] === "" || cleaned[k] === null) cleaned[k] = null;
      else if (typeof cleaned[k] === "string") cleaned[k] = Number(cleaned[k]);
    }
    const result = await saveBriefing(token, cleaned, complete);
    if (result?.error) {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
    } else {
      toast({ title: complete ? "Briefing enviado!" : "Salvo automaticamente" });
      if (complete) window.location.reload();
    }
    setLoading(false);
  }

  function next() {
    handleSave(false);
    setStep(Math.min(STEPS.length - 1, step + 1));
  }

  function prev() {
    setStep(Math.max(0, step - 1));
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          Etapa {step + 1} de {STEPS.length}
        </div>
        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mb-4">
          <div className="h-full bg-adria transition-all" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <span>{STEPS[step].emoji}</span>
          {STEPS[step].title}
        </h1>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 space-y-4">
        {step === 0 && (
          <>
            <Field label="O que sua empresa faz?">
              <Textarea
                rows={3}
                value={String(data.business_description)}
                onChange={(e) => update("business_description", e.target.value)}
              />
            </Field>
            <Field label="Quem é seu cliente ideal?">
              <Textarea
                rows={3}
                value={String(data.target_audience)}
                onChange={(e) => update("target_audience", e.target.value)}
              />
            </Field>
            <Field label="Principais produtos/serviços">
              <Textarea
                rows={2}
                value={String(data.main_products_services)}
                onChange={(e) => update("main_products_services", e.target.value)}
              />
            </Field>
            <Field label="O que te diferencia da concorrência?">
              <Textarea
                rows={2}
                value={String(data.differentials)}
                onChange={(e) => update("differentials", e.target.value)}
              />
            </Field>
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="Ticket médio (R$)">
                <Input
                  type="number"
                  value={String(data.average_ticket)}
                  onChange={(e) => update("average_ticket", e.target.value)}
                />
              </Field>
              <Field label="Faixa de faturamento">
                <Input
                  value={String(data.monthly_revenue_range)}
                  onChange={(e) => update("monthly_revenue_range", e.target.value)}
                  placeholder="Ex: R$ 30k a R$ 50k/mês"
                />
              </Field>
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <CheckboxField
              label="Tem site"
              checked={Boolean(data.has_website)}
              onChange={(v) => update("has_website", v)}
            />
            {Boolean(data.has_website) && (
              <Field label="URL do site">
                <Input value={String(data.website_url)} onChange={(e) => update("website_url", e.target.value)} />
              </Field>
            )}
            <CheckboxField
              label="Tem Instagram"
              checked={Boolean(data.has_instagram)}
              onChange={(v) => update("has_instagram", v)}
            />
            {Boolean(data.has_instagram) && (
              <Field label="@instagram">
                <Input value={String(data.instagram_handle)} onChange={(e) => update("instagram_handle", e.target.value)} />
              </Field>
            )}
            <CheckboxField
              label="Tem Google Business"
              checked={Boolean(data.has_google_business)}
              onChange={(v) => update("has_google_business", v)}
            />
            <Field label="Investimento mensal atual em ads (R$)">
              <Input
                type="number"
                value={String(data.current_ads_investment)}
                onChange={(e) => update("current_ads_investment", e.target.value)}
              />
            </Field>
            <Field label="Já trabalhou com agência? Como foi?">
              <Textarea
                rows={3}
                value={String(data.previous_agency_experience)}
                onChange={(e) => update("previous_agency_experience", e.target.value)}
              />
            </Field>
          </>
        )}
        {step === 2 && (
          <>
            <Field label="Qual o objetivo principal?">
              <Input
                value={String(data.main_goal)}
                onChange={(e) => update("main_goal", e.target.value)}
                placeholder="Ex: gerar 50 leads/mês"
              />
            </Field>
            <Field label="Meta de leads/mês">
              <Input
                type="number"
                value={String(data.monthly_lead_goal)}
                onChange={(e) => update("monthly_lead_goal", e.target.value)}
              />
            </Field>
            <Field label="Meta de faturamento adicional/mês (R$)">
              <Input
                type="number"
                value={String(data.monthly_revenue_goal)}
                onChange={(e) => update("monthly_revenue_goal", e.target.value)}
              />
            </Field>
          </>
        )}
        {step === 3 && (
          <>
            <CheckboxField
              label="Tenho manual de marca"
              checked={Boolean(data.has_brand_guide)}
              onChange={(v) => update("has_brand_guide", v)}
            />
            <Field label="Cores da marca (hex separados por vírgula)">
              <Input
                value={String(data.brand_colors)}
                onChange={(e) => update("brand_colors", e.target.value)}
                placeholder="#1a1a2e, #4A90D9"
              />
            </Field>
            <Field label="Fontes utilizadas">
              <Input value={String(data.brand_fonts)} onChange={(e) => update("brand_fonts", e.target.value)} />
            </Field>
            <p className="text-xs text-slate-500">
              Você poderá enviar logos e imagens na aba <strong>Materiais</strong>.
            </p>
          </>
        )}
        {step === 4 && (
          <>
            <Field label="Acesso ao Business Manager do Meta">
              <Textarea
                rows={3}
                value={String(data.meta_business_manager_access)}
                onChange={(e) => update("meta_business_manager_access", e.target.value)}
                placeholder="Tem BM? Pode dar acesso? Email do admin?"
              />
            </Field>
            <Field label="Acesso ao Google Ads">
              <Textarea
                rows={3}
                value={String(data.google_ads_access)}
                onChange={(e) => update("google_ads_access", e.target.value)}
              />
            </Field>
          </>
        )}
        {step === 5 && (
          <>
            <Field label="Concorrentes principais">
              <Textarea
                rows={3}
                value={String(data.competitors)}
                onChange={(e) => update("competitors", e.target.value)}
              />
            </Field>
            <Field label="Datas/épocas sazonais importantes">
              <Textarea
                rows={2}
                value={String(data.seasonal_periods)}
                onChange={(e) => update("seasonal_periods", e.target.value)}
              />
            </Field>
            <Field label="O que NÃO devemos comunicar">
              <Textarea
                rows={2}
                value={String(data.restrictions)}
                onChange={(e) => update("restrictions", e.target.value)}
              />
            </Field>
            <Field label="Observações finais">
              <Textarea
                rows={3}
                value={String(data.additional_notes)}
                onChange={(e) => update("additional_notes", e.target.value)}
              />
            </Field>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" onClick={prev} disabled={step === 0}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
        {step < STEPS.length - 1 ? (
          <Button onClick={next}>
            Próximo <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={() => handleSave(true)} disabled={loading} className="bg-adria hover:bg-adria/90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enviar briefing"}
          </Button>
        )}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function CheckboxField({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4" />
      <span className="text-sm">{label}</span>
    </label>
  );
}
