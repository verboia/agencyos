import { requireClientByToken } from "@/lib/services/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight } from "lucide-react";

export default async function PortalHomePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await requireClientByToken(token);
  const supabase = createAdminClient();

  const [{ data: briefing }, { data: contract }, { data: tasks }] = await Promise.all([
    supabase.from("client_briefings").select("status").eq("client_id", client.id).maybeSingle(),
    supabase.from("contracts").select("id, status").eq("client_id", client.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("tasks").select("id, status").eq("client_id", client.id).eq("category", "onboarding"),
  ]);

  const briefingDone = briefing?.status === "completed" || briefing?.status === "approved";
  const contractSigned = contract?.status === "signed";
  const onboardingProgress = client.onboarding_progress;

  const steps = [
    { done: true, label: "Acessar o portal da Adria" },
    { done: briefingDone, label: "Preencher o briefing", href: `/portal/${token}/briefing` },
    { done: contractSigned, label: "Assinar o contrato", href: `/portal/${token}/contract` },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-semibold">Olá, {client.contact_name.split(" ")[0]} 👋</h1>
        <p className="text-slate-600 text-sm mt-2">
          Bem-vindo(a) ao seu portal da Adria. Aqui você acompanha o andamento da sua estratégia de geração de demanda.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="text-lg font-semibold mb-4">Próximos passos</h2>
        <div className="space-y-2">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className={`flex items-center gap-3 p-3 rounded-lg ${step.done ? "bg-green-50" : "bg-slate-50"}`}
            >
              {step.done ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-slate-400 shrink-0" />
              )}
              <span className={`flex-1 text-sm ${step.done ? "text-slate-500 line-through" : "font-medium"}`}>
                {step.label}
              </span>
              {!step.done && step.href && (
                <Link href={step.href} className="text-adria text-sm font-medium flex items-center gap-1">
                  Fazer agora <ArrowRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>

      {client.status === "onboarding" && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Progresso do onboarding</span>
            <span className="text-sm text-slate-500">{onboardingProgress}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div className="h-full bg-adria transition-all" style={{ width: `${onboardingProgress}%` }} />
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Assim que concluirmos o setup, suas campanhas começam a rodar.
          </p>
        </div>
      )}
    </div>
  );
}
