import { requireClientByToken } from "@/lib/services/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { BriefingForm } from "@/components/portal/briefing-form";

export default async function PortalBriefingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await requireClientByToken(token);
  const supabase = createAdminClient();
  const { data: briefing } = await supabase
    .from("client_briefings")
    .select("*")
    .eq("client_id", client.id)
    .maybeSingle();

  if (briefing?.status === "completed" || briefing?.status === "approved") {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 text-center space-y-3">
        <div className="text-4xl">✅</div>
        <h1 className="text-xl font-semibold">Briefing recebido!</h1>
        <p className="text-sm text-slate-600">
          Já temos todas as informações que precisamos. Nossa equipe está trabalhando na sua estratégia.
        </p>
      </div>
    );
  }

  return <BriefingForm token={token} briefing={briefing} />;
}
