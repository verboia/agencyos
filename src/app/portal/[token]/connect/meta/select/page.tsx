import { notFound, redirect } from "next/navigation";
import { requireClientByToken } from "@/lib/services/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target } from "lucide-react";
import { MetaAccountSelector } from "@/components/portal/meta-account-selector";

interface Params {
  params: Promise<{ token: string }>;
}

export default async function MetaAccountSelectionPage({ params }: Params) {
  const { token } = await params;
  const client = await requireClientByToken(token);

  const supabase = createAdminClient();
  const { data: pendings } = await supabase
    .from("ad_integrations")
    .select(
      "id, external_account_id, external_account_name, metadata, granted_scopes"
    )
    .eq("client_id", client.id)
    .eq("platform", "meta")
    .eq("status", "pending_selection")
    .order("external_account_name");

  if (!pendings || pendings.length === 0) {
    redirect(`/portal/${token}/connect`);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-1">
          <Target className="h-5 w-5 text-[#1877f2]" />
          <h1 className="text-2xl font-semibold">Escolha as contas de anúncios</h1>
        </div>
        <p className="text-sm text-slate-600 mt-1">
          A Meta devolveu {pendings!.length} conta{pendings!.length === 1 ? "" : "s"} que você tem
          acesso. Marque apenas a{pendings!.length === 1 ? "" : "s"} que deseja vincular à Adria.
        </p>
      </div>

      <Alert>
        <AlertDescription className="text-sm">
          Só as contas selecionadas aqui aparecerão nos seus relatórios. As demais serão descartadas
          e você pode conectá-las depois se precisar.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contas disponíveis</CardTitle>
          <CardDescription>
            Revise nome, ID e Business Manager de cada conta antes de confirmar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <MetaAccountSelector
            token={token}
            accounts={pendings!.map((p) => ({
              id: p.id,
              external_account_id: p.external_account_id,
              external_account_name: p.external_account_name ?? "(sem nome)",
              business_name:
                (p.metadata as { business_name?: string } | null)?.business_name ?? null,
              currency: (p.metadata as { currency?: string } | null)?.currency ?? null,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
