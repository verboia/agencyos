import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, ExternalLink, MessageCircle, Users, AlertCircle, RefreshCw } from "lucide-react";
import {
  saveWapiConfig,
  syncWapiGroups,
  linkGroupToClient,
  unlinkGroupFromClient,
  updateGroupLinkSettings,
} from "./actions";
import { formatRelativeTime } from "@/lib/utils/format";

export default async function WhatsAppWapiSettingsPage() {
  const supabase = await createServerClient();

  const [{ data: config }, { data: groups }, { data: links }, { data: clients }] =
    await Promise.all([
      supabase.from("wapi_config").select("*").maybeSingle(),
      supabase
        .from("wapi_groups_cache")
        .select("*")
        .order("subject", { ascending: true }),
      supabase
        .from("client_whatsapp_groups")
        .select("*, clients(id, company_name)")
        .order("created_at", { ascending: false }),
      supabase
        .from("clients")
        .select("id, company_name")
        .order("company_name", { ascending: true }),
    ]);

  const isConfigured = Boolean(config?.instance_id && config?.token && config?.is_active);
  type LinkRow = NonNullable<typeof links>[number];
  const linksByGroup = new Map<string, LinkRow[]>();
  for (const link of links ?? []) {
    const list = linksByGroup.get(link.group_id) ?? [];
    list.push(link);
    linksByGroup.set(link.group_id, list);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold tracking-tight">WhatsApp (W-API)</h1>
          <p className="text-sm text-muted-foreground">
            Conecte sua instância W-API para enviar relatórios e alertas para grupos do WhatsApp.
            {" "}
            <Link href="/settings/whatsapp/templates" className="underline">
              Templates Meta Cloud
            </Link>{" "}
            (régua de cobrança) ficam em outra tela.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Credenciais da instância</CardTitle>
          <CardDescription>
            Pegue esses valores no painel da W-API (
            <a
              href="https://w-api.app"
              target="_blank"
              rel="noopener noreferrer"
              className="underline inline-flex items-center gap-1"
            >
              w-api.app <ExternalLink className="h-3 w-3" />
            </a>
            ) após escanear o QR Code com o número que está nos grupos.
          </CardDescription>
        </CardHeader>
        <form action={saveWapiConfig}>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Instance ID *</Label>
              <Input
                name="instance_id"
                defaultValue={config?.instance_id ?? ""}
                placeholder="ex: A1B2C3D4..."
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Token *</Label>
              <Input
                name="token"
                type="password"
                defaultValue={config?.token ?? ""}
                placeholder="Bearer token da instância"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label>Número de telefone (exibição)</Label>
              <Input
                name="display_phone_number"
                defaultValue={config?.display_phone_number ?? ""}
                placeholder="+55 67 99141-8064"
              />
              <p className="text-xs text-muted-foreground">
                Só para você lembrar qual número está conectado. Não é enviado a lugar nenhum.
              </p>
            </div>
            <div className="flex justify-end">
              <Button type="submit">Salvar</Button>
            </div>
          </CardContent>
        </form>
      </Card>

      {!isConfigured && (
        <Alert>
          <AlertDescription>
            Configure e salve as credenciais acima antes de listar os grupos.
          </AlertDescription>
        </Alert>
      )}

      {isConfigured && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" /> Grupos do WhatsApp
              </CardTitle>
              <CardDescription>
                {config?.last_groups_sync_at
                  ? `${config.last_groups_sync_count ?? 0} grupo${(config.last_groups_sync_count ?? 0) === 1 ? "" : "s"} · sincronizado ${formatRelativeTime(config.last_groups_sync_at)}`
                  : "Ainda não sincronizado. Clique em \"Listar grupos\" para buscar."}
              </CardDescription>
              {config?.last_groups_sync_error && (
                <div className="mt-2 text-xs text-red-600 flex items-start gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span className="line-clamp-2">{config.last_groups_sync_error}</span>
                </div>
              )}
            </div>
            <form action={syncWapiGroups}>
              <Button type="submit" variant="outline" size="sm">
                <RefreshCw className="h-4 w-4" /> Listar grupos
              </Button>
            </form>
          </CardHeader>
          <CardContent className="space-y-3">
            {(groups?.length ?? 0) === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhum grupo encontrado ainda. Verifique se o número está em pelo menos um grupo e
                clique em &quot;Listar grupos&quot;.
              </p>
            ) : (
              groups!.map((g) => {
                const groupLinks = linksByGroup.get(g.group_id) ?? [];
                return (
                  <div
                    key={g.group_id}
                    className="rounded-lg border border-slate-200 p-3 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate flex items-center gap-2">
                          <MessageCircle className="h-3.5 w-3.5 text-[#25d366]" />
                          {g.subject ?? "(sem nome)"}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {g.participants_count ? `${g.participants_count} participantes · ` : ""}
                          <code className="text-[10px]">{g.group_id}</code>
                        </div>
                      </div>
                    </div>

                    {groupLinks.length > 0 && (
                      <div className="space-y-2 border-t border-slate-100 pt-2">
                        <div className="text-xs font-medium text-muted-foreground">
                          Clientes vinculados
                        </div>
                        {groupLinks.map((link) => {
                          const client = Array.isArray(link.clients)
                            ? link.clients[0]
                            : link.clients;
                          return (
                            <details key={link.id} className="text-xs">
                              <summary className="cursor-pointer flex items-center justify-between gap-2 py-1 hover:bg-accent rounded px-1">
                                <span>
                                  <span className="font-medium">{client?.company_name ?? "Cliente removido"}</span>
                                  <span className="text-muted-foreground"> · {link.purpose}</span>
                                  {!link.is_active && (
                                    <span className="text-amber-600 ml-1">(pausado)</span>
                                  )}
                                </span>
                                <span className="text-muted-foreground">▾</span>
                              </summary>
                              <form action={updateGroupLinkSettings} className="mt-2 ml-3 space-y-2 p-3 bg-muted/40 border border-border rounded text-foreground">
                                <input type="hidden" name="link_id" value={link.id} />
                                <div className="grid grid-cols-2 gap-2">
                                  <label className="text-xs space-y-0.5">
                                    <span className="text-muted-foreground">Propósito</span>
                                    <select
                                      name="purpose"
                                      defaultValue={link.purpose}
                                      className="block w-full text-xs h-8 rounded-md border border-input bg-background px-2"
                                    >
                                      <option value="reports">Relatórios</option>
                                      <option value="internal">Interno (Adria)</option>
                                      <option value="general">Geral</option>
                                    </select>
                                  </label>
                                  <label className="text-xs space-y-0.5">
                                    <span className="text-muted-foreground">Saldo mínimo (R$)</span>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      name="low_balance_threshold"
                                      defaultValue={String(link.low_balance_threshold ?? 100)}
                                      className="h-8 text-xs"
                                    />
                                  </label>
                                </div>
                                <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      name="send_weekly_report"
                                      defaultChecked={link.send_weekly_report}
                                    />
                                    <span>Relatório semanal</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      name="send_daily_report"
                                      defaultChecked={link.send_daily_report}
                                    />
                                    <span>Relatório diário</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      name="send_monthly_report"
                                      defaultChecked={link.send_monthly_report}
                                    />
                                    <span>Relatório mensal</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      name="send_balance_alerts"
                                      defaultChecked={link.send_balance_alerts}
                                    />
                                    <span>Alertas de saldo</span>
                                  </label>
                                  <label className="flex items-center gap-2 col-span-2 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      name="is_active"
                                      defaultChecked={link.is_active}
                                    />
                                    <span>Vínculo ativo</span>
                                  </label>
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                  <UnlinkButton linkId={link.id} />
                                  <Button type="submit" size="sm" variant="outline">
                                    Salvar
                                  </Button>
                                </div>
                              </form>
                            </details>
                          );
                        })}
                      </div>
                    )}

                    <form action={linkGroupToClient} className="flex items-center gap-2 border-t border-slate-100 pt-2">
                      <input type="hidden" name="group_id" value={g.group_id} />
                      <input type="hidden" name="group_subject" value={g.subject ?? ""} />
                      <select
                        name="client_id"
                        required
                        className="flex-1 text-xs h-8 rounded-md border border-input bg-background px-2"
                        defaultValue=""
                      >
                        <option value="" disabled>
                          Vincular a um cliente…
                        </option>
                        {(clients ?? []).map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.company_name}
                          </option>
                        ))}
                      </select>
                      <select
                        name="purpose"
                        defaultValue="reports"
                        className="text-xs h-8 rounded-md border border-input bg-background px-2"
                      >
                        <option value="reports">Relatórios</option>
                        <option value="internal">Interno</option>
                        <option value="general">Geral</option>
                      </select>
                      <Button type="submit" size="sm">
                        Vincular
                      </Button>
                    </form>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function UnlinkButton({ linkId }: { linkId: string }) {
  return (
    <form action={unlinkGroupFromClient}>
      <input type="hidden" name="link_id" value={linkId} />
      <Button
        type="submit"
        size="sm"
        variant="ghost"
        className="text-red-600 hover:text-red-700 hover:bg-red-50"
      >
        Desvincular
      </Button>
    </form>
  );
}
