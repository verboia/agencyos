import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { Target, AlertTriangle, Wallet } from "lucide-react";
import { formatCurrency, formatRelativeTime } from "@/lib/utils/format";

interface IntegrationMetadata {
  currency?: string;
  balance?: number | null;
  spend_cap?: number | null;
  amount_spent?: number | null;
  balance_synced_at?: string;
}

interface IntegrationRow {
  id: string;
  client_id: string;
  external_account_id: string;
  external_account_name: string | null;
  last_sync_at: string | null;
  metadata: IntegrationMetadata | null;
  clients: { id: string; company_name: string } | { id: string; company_name: string }[] | null;
}

const LOW_BALANCE_THRESHOLD = 100; // R$ — destaca em vermelho abaixo disso

export async function MetaBalancesCard() {
  const supabase = await createServerClient();

  const { data } = await supabase
    .from("ad_integrations")
    .select(
      "id, client_id, external_account_id, external_account_name, last_sync_at, metadata, clients(id, company_name)"
    )
    .eq("platform", "meta")
    .eq("status", "connected")
    .order("last_sync_at", { ascending: false });

  const integrations = (data ?? []) as IntegrationRow[];

  const rows = integrations
    .map((i) => {
      const md = i.metadata ?? {};
      const client = Array.isArray(i.clients) ? i.clients[0] : i.clients;
      return {
        integrationId: i.id,
        clientId: client?.id ?? i.client_id,
        clientName: client?.company_name ?? "—",
        accountName: i.external_account_name ?? `Conta #${i.external_account_id}`,
        balance: typeof md.balance === "number" ? md.balance : null,
        spendCap: typeof md.spend_cap === "number" ? md.spend_cap : null,
        amountSpent: typeof md.amount_spent === "number" ? md.amount_spent : null,
        syncedAt: md.balance_synced_at ?? i.last_sync_at ?? null,
        hasData: md.balance !== undefined || md.spend_cap !== undefined,
      };
    })
    .sort((a, b) => {
      // Ordena: com dados primeiro, depois pelo menor saldo.
      if (a.hasData !== b.hasData) return a.hasData ? -1 : 1;
      const aBal = a.balance ?? Number.POSITIVE_INFINITY;
      const bBal = b.balance ?? Number.POSITIVE_INFINITY;
      return aBal - bBal;
    });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-[#1877f2]" /> Saldo Meta Ads por cliente
            </CardTitle>
            <CardDescription className="mt-1">
              Sincronizado quando você clica em &quot;Sincronizar&quot; na aba Integrações do cliente.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhuma conta Meta Ads conectada ainda.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const lowBalance =
                r.balance !== null && r.balance > 0 && r.balance < LOW_BALANCE_THRESHOLD;
              const isPrepaid = r.balance !== null && r.balance > 0;
              return (
                <li key={r.integrationId}>
                  <Link
                    href={`/clients/${r.clientId}?tab=integrations`}
                    className="flex items-center justify-between gap-3 py-3 hover:bg-accent/40 -mx-2 px-2 rounded-md"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium truncate">{r.clientName}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {r.accountName}
                        {r.syncedAt && <> · atualizado {formatRelativeTime(r.syncedAt)}</>}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      {r.hasData ? (
                        isPrepaid ? (
                          <div
                            className={`text-sm font-semibold flex items-center gap-1 justify-end ${
                              lowBalance ? "text-red-600" : "text-foreground"
                            }`}
                          >
                            {lowBalance && <AlertTriangle className="h-3.5 w-3.5" />}
                            {formatCurrency(r.balance)}
                          </div>
                        ) : r.amountSpent !== null && r.spendCap !== null && r.spendCap > 0 ? (
                          <div className="text-sm font-semibold">
                            {formatCurrency(Math.max(r.spendCap - r.amountSpent, 0))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Pós-pago</div>
                        )
                      ) : (
                        <div className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                          <Wallet className="h-3 w-3" /> sincronizar
                        </div>
                      )}
                      {r.amountSpent !== null && r.hasData && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          gasto: {formatCurrency(r.amountSpent)}
                        </div>
                      )}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
