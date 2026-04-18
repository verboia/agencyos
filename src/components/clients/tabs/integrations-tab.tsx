import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, Search, Music2, CheckCircle2, AlertCircle } from "lucide-react";
import { formatRelativeTime } from "@/lib/utils/format";
import { APP_URL } from "@/lib/utils/constants";
import { CopyConnectLinkButton } from "@/components/clients/copy-connect-link-button";
import { SyncMetaButton } from "@/components/clients/sync-meta-button";

export async function ClientIntegrationsTab({ clientId }: { clientId: string }) {
  const supabase = await createServerClient();

  const { data: client } = await supabase
    .from("clients")
    .select("public_token")
    .eq("id", clientId)
    .single();

  if (!client) return null;

  const { data: integrations } = await supabase
    .from("ad_integrations")
    .select(
      "id, platform, external_account_id, external_account_name, status, last_sync_at, last_sync_error, connected_at"
    )
    .eq("client_id", clientId)
    .in("status", ["connected", "expired", "revoked", "error"])
    .order("connected_at", { ascending: false });

  const byPlatform = {
    meta: integrations?.filter((i) => i.platform === "meta") ?? [],
    google: integrations?.filter((i) => i.platform === "google") ?? [],
    tiktok: integrations?.filter((i) => i.platform === "tiktok") ?? [],
  };

  const connectLink = `${APP_URL}/portal/${client.public_token}/connect`;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div>
            <CardTitle className="text-base">Link de conexão do cliente</CardTitle>
            <CardDescription className="mt-1">
              Envie este link para o cliente conectar as contas de anúncios dele.
            </CardDescription>
          </div>
          <CopyConnectLinkButton link={connectLink} />
        </CardHeader>
        <CardContent>
          <code className="text-xs break-all block bg-muted p-2 rounded">{connectLink}</code>
        </CardContent>
      </Card>

      <PlatformCard
        title="Meta Ads"
        icon={<Target className="h-4 w-4 text-[#1877f2]" />}
        integrations={byPlatform.meta}
        action={byPlatform.meta.length > 0 ? <SyncMetaButton clientId={clientId} /> : null}
      />

      <PlatformCard
        title="Google Ads"
        icon={<Search className="h-4 w-4 text-[#4285f4]" />}
        integrations={byPlatform.google}
        disabledReason="Aguardando Developer Token (configure em Settings → Google Ads)."
      />

      <PlatformCard
        title="TikTok Ads"
        icon={<Music2 className="h-4 w-4" />}
        integrations={byPlatform.tiktok}
        disabledReason="Aguardando registro do app (configure em Settings → TikTok Ads)."
      />
    </div>
  );
}

function PlatformCard({
  title,
  icon,
  integrations,
  disabledReason,
  action,
}: {
  title: string;
  icon: React.ReactNode;
  integrations: Array<{
    id: string;
    external_account_id: string;
    external_account_name: string | null;
    status: string;
    last_sync_at: string | null;
    last_sync_error: string | null;
    connected_at: string | null;
  }>;
  disabledReason?: string;
  action?: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <CardTitle className="text-base flex items-center gap-2">{icon} {title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent className="space-y-2">
        {integrations.length === 0 ? (
          <Alert>
            <AlertDescription className="text-xs">
              {disabledReason ?? "Nenhuma conta conectada. Envie o link de conexão para o cliente."}
            </AlertDescription>
          </Alert>
        ) : (
          integrations.map((i) => (
            <div
              key={i.id}
              className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium truncate">
                  {i.external_account_name ?? `Conta #${i.external_account_id}`}
                </div>
                <div className="text-xs text-muted-foreground">
                  ID {i.external_account_id}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {i.last_sync_at
                    ? `Sincronizado ${formatRelativeTime(i.last_sync_at)}`
                    : "Ainda não sincronizado"}
                </div>
                {i.last_sync_error && (
                  <div className="text-xs text-red-600 mt-1 line-clamp-2">
                    Erro: {i.last_sync_error}
                  </div>
                )}
              </div>
              <StatusBadge status={i.status} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "connected") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded">
        <CheckCircle2 className="h-3 w-3" /> conectada
      </span>
    );
  }
  if (status === "expired" || status === "revoked") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-1 rounded">
        <AlertCircle className="h-3 w-3" /> reconectar
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-1 rounded">
      <AlertCircle className="h-3 w-3" /> {status}
    </span>
  );
}
