import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/format";

export async function ClientBriefingTab({ clientId }: { clientId: string }) {
  const supabase = await createServerClient();
  const { data: briefing } = await supabase
    .from("client_briefings")
    .select("*")
    .eq("client_id", clientId)
    .maybeSingle();

  if (!briefing || briefing.status === "pending") {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Badge variant="warning">Pendente</Badge>
          <p className="text-sm text-muted-foreground mt-3">
            O cliente ainda não preencheu o briefing. Envie o link do portal.
          </p>
        </CardContent>
      </Card>
    );
  }

  const sections: Array<{ title: string; items: Array<[string, string | number | null | undefined]> }> = [
    {
      title: "Sobre o negócio",
      items: [
        ["O que faz", briefing.business_description],
        ["Público-alvo", briefing.target_audience],
        ["Produtos/Serviços", briefing.main_products_services],
        ["Diferenciais", briefing.differentials],
        ["Ticket médio", briefing.average_ticket ? formatCurrency(briefing.average_ticket) : "—"],
        ["Faturamento", briefing.monthly_revenue_range],
      ],
    },
    {
      title: "Marketing",
      items: [
        ["Site", briefing.has_website ? briefing.website_url ?? "Sim" : "Não"],
        ["Instagram", briefing.has_instagram ? briefing.instagram_handle ?? "Sim" : "Não"],
        ["Google Business", briefing.has_google_business ? "Sim" : "Não"],
        ["Investimento atual em ads", briefing.current_ads_investment ? formatCurrency(briefing.current_ads_investment) : "—"],
      ],
    },
    {
      title: "Objetivos",
      items: [
        ["Meta principal", briefing.main_goal],
        ["Meta de leads", briefing.monthly_lead_goal],
        ["Meta de faturamento", briefing.monthly_revenue_goal ? formatCurrency(briefing.monthly_revenue_goal) : "—"],
      ],
    },
    {
      title: "Materiais",
      items: [
        ["Manual de marca", briefing.has_brand_guide ? "Sim" : "Não"],
        ["Cores", briefing.brand_colors],
        ["Fontes", briefing.brand_fonts],
      ],
    },
    {
      title: "Extras",
      items: [
        ["Concorrentes", briefing.competitors],
        ["Sazonalidades", briefing.seasonal_periods],
        ["Restrições", briefing.restrictions],
        ["Observações", briefing.additional_notes],
      ],
    },
  ];

  return (
    <div className="space-y-4">
      {sections.map((s) => (
        <Card key={s.title}>
          <CardHeader>
            <CardTitle className="text-base">{s.title}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {s.items.map(([label, value]) => (
              <div key={label}>
                <div className="text-xs text-muted-foreground">{label}</div>
                <div className="text-sm mt-0.5 whitespace-pre-wrap">{value || "—"}</div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
