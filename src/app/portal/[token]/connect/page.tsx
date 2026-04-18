import { requireClientByToken } from "@/lib/services/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, Search, Music2, CheckCircle2, AlertCircle } from "lucide-react";
interface Params {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ connected?: string; accounts?: string; meta_error?: string }>;
}

export default async function PortalConnectPage({ params, searchParams }: Params) {
  const { token } = await params;
  const search = await searchParams;
  const client = await requireClientByToken(token);

  const supabase = createAdminClient();

  const [{ data: platformConfigs }, { data: integrations }] = await Promise.all([
    supabase
      .from("ad_platform_configs")
      .select("platform, is_active")
      .eq("organization_id", client.organization_id),
    supabase
      .from("ad_integrations")
      .select("platform, external_account_name, external_account_id, status, connected_at")
      .eq("client_id", client.id)
      .in("status", ["connected", "expired", "revoked", "error"]),
  ]);

  const isMetaEnabled = Boolean(
    platformConfigs?.find((p) => p.platform === "meta" && p.is_active)
  );
  const metaIntegrations = integrations?.filter((i) => i.platform === "meta") ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h1 className="text-2xl font-semibold">Conecte suas contas de anúncios</h1>
        <p className="text-sm text-slate-600 mt-1">
          Autorize a Adria a ler as métricas das suas contas de anúncios. Seus dados são usados
          exclusivamente para gerar os relatórios da sua operação.
        </p>
      </div>

      {search.connected === "meta" && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            {search.accounts
              ? `Meta Ads conectado com sucesso! ${search.accounts} conta${Number(search.accounts) === 1 ? "" : "s"} vinculada${Number(search.accounts) === 1 ? "" : "s"}. Seus dados começarão a aparecer nos próximos relatórios.`
              : "Meta Ads conectado com sucesso!"}
          </AlertDescription>
        </Alert>
      )}

      {search.meta_error === "no_accounts_shared" && (
        <Alert className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            A autorização foi concluída, mas você não selecionou nenhuma conta de anúncios para
            compartilhar. Clique em <strong>Conectar Meta Ads</strong> de novo e, na tela da Meta,
            marque as contas que a Adria deve ter acesso.
          </AlertDescription>
        </Alert>
      )}

      {search.meta_error && search.meta_error !== "no_accounts_shared" && (
        <Alert className="border-red-200 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Não conseguimos finalizar a conexão com a Meta: {search.meta_error}. Tente novamente ou
            fale com a gente.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-[#1877f2]" /> Meta Ads
            </CardTitle>
            <CardDescription>Facebook, Instagram e Messenger Ads.</CardDescription>
          </CardHeader>
          <CardContent>
            {metaIntegrations.length > 0 ? (
              <div className="space-y-2">
                {metaIntegrations.map((i) => (
                  <div
                    key={i.external_account_id}
                    className="flex items-center justify-between bg-slate-50 rounded-lg p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">{i.external_account_name}</div>
                      <div className="text-xs text-slate-500">
                        Conta #{i.external_account_id} · {statusLabel(i.status)}
                      </div>
                    </div>
                    <span className="text-xs text-green-600 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> conectada
                    </span>
                  </div>
                ))}
                <Button asChild variant="outline" className="w-full">
                  <a href={`/api/integrations/meta/start?token=${token}`}>
                    Conectar outra conta
                  </a>
                </Button>
              </div>
            ) : isMetaEnabled ? (
              <Button asChild className="w-full bg-[#1877f2] hover:bg-[#1877f2]/90">
                <a href={`/api/integrations/meta/start?token=${token}`}>
                  Conectar Meta Ads
                </a>
              </Button>
            ) : (
              <Alert>
                <AlertDescription className="text-xs">
                  A integração com Meta Ads ainda não foi ativada pela agência.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <Card className="opacity-70">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Search className="h-4 w-4 text-[#4285f4]" /> Google Ads
            </CardTitle>
            <CardDescription>Rede de Pesquisa, Display, YouTube.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled className="w-full" variant="outline">
              Em breve
            </Button>
          </CardContent>
        </Card>

        <Card className="opacity-70">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Music2 className="h-4 w-4" /> TikTok Ads
            </CardTitle>
            <CardDescription>TikTok Marketing API.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button disabled className="w-full" variant="outline">
              Em breve
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case "connected":
      return "ativo";
    case "expired":
      return "token expirado";
    case "revoked":
      return "acesso revogado";
    case "error":
      return "erro";
    default:
      return status;
  }
}
