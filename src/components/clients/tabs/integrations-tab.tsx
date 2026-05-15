import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Target, Search, Music2, CheckCircle2, AlertCircle, Wallet, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRelativeTime, formatCurrency } from "@/lib/utils/format";
import { APP_URL } from "@/lib/utils/constants";
import { CopyConnectLinkButton } from "@/components/clients/copy-connect-link-button";
import { SyncMetaButton } from "@/components/clients/sync-meta-button";
import { SendWhatsAppDialog } from "@/components/clients/send-whatsapp-dialog";

interface IntegrationMetadata {
  currency?: string;
  balance?: number | null;
  spend_cap?: number | null;
  amount_spent?: number | null;
  balance_synced_at?: string;
  disable_reason?: number | null;
  funding_source?: string | null;
}

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
      "id, platform, external_account_id, external_account_name, status, last_sync_at, last_sync_error, connected_at, metadata"
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
        action={
          byPlatform.meta.length > 0 ? (
            <div className="flex flex-col items-end gap-1.5">
              <SyncMetaButton clientId={clientId} />
              <SendWhatsAppDialog
                clientId={clientId}
                mode="balance_alert"
                trigger={
                  <Button size="sm" variant="ghost" className="text-xs h-7">
                    <Send className="h-3.5 w-3.5" /> Avisar saldo no WhatsApp
                  </Button>
                }
              />
            </div>
          ) : null
        }
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
    metadata: IntegrationMetadata | null;
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
              className="rounded-lg border border-slate-200 p-3 text-sm space-y-3"
            >
              <div className="flex items-start justify-between gap-3">
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
              <BalanceRow metadata={i.metadata} />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

function BalanceRow({ metadata }: { metadata: IntegrationMetadata | null }) {
  const hasBalanceData =
    metadata &&
    (metadata.balance !== undefined ||
      metadata.spend_cap !== undefined ||
      metadata.amount_spent !== undefined);

  if (!hasBalanceData) {
    return (
      <div className="border-t border-slate-100 pt-2 text-xs text-muted-foreground flex items-center gap-1.5">
        <Wallet className="h-3.5 w-3.5" />
        Saldo ainda não sincronizado — clique em &quot;Sincronizar&quot;.
      </div>
    );
  }

  // Semântica Meta Ads (prepago BR):
  //  - balance = DÍVIDA em aberto (em conta prepago saudável = 0)
  //  - spend_cap = total recarregado/limite
  //  - amount_spent = gasto acumulado
  //  - saldo disponível = spend_cap - amount_spent
  const debt = metadata.balance ?? null;
  const spendCap = metadata.spend_cap ?? null;
  const amountSpent = metadata.amount_spent ?? null;
  const hasCap = spendCap !== null && spendCap > 0;
  const available = hasCap && amountSpent !== null ? Math.max(spendCap - amountSpent, 0) : null;
  const hasDebt = debt !== null && debt > 0;
  const lowBalance = available !== null && available < 100;

  return (
    <div className="border-t border-slate-100 pt-2 space-y-2">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <div className="text-muted-foreground flex items-center gap-1">
            <Wallet className="h-3.5 w-3.5" /> Saldo disponível
          </div>
          <div className={`font-semibold mt-0.5 ${lowBalance ? "text-red-600" : "text-foreground"}`}>
            {available !== null ? formatCurrency(available) : "—"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Gasto acumulado</div>
          <div className="font-semibold mt-0.5">
            {amountSpent !== null ? formatCurrency(amountSpent) : "—"}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Total recarregado</div>
          <div className="font-semibold mt-0.5">
            {hasCap ? formatCurrency(spendCap) : "Sem limite"}
          </div>
        </div>
      </div>
      {hasDebt && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          Dívida em aberto: <span className="font-semibold">{formatCurrency(debt)}</span>
        </div>
      )}
    </div>
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
