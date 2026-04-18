import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatRelativeTime } from "@/lib/utils/format";
import { Badge } from "@/components/ui/badge";

export async function AdminDashboard() {
  const supabase = await createServerClient();

  const [{ data: overdueTasks }, { data: recentActivity }, { data: pendingContracts }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, due_date, client_id, clients(company_name)")
      .in("status", ["pending", "in_progress", "blocked"])
      .lt("due_date", new Date().toISOString().slice(0, 10))
      .order("due_date", { ascending: true })
      .limit(8),
    supabase
      .from("activity_log")
      .select("id, action, description, created_at, client_id, clients(company_name)")
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("contracts")
      .select("id, contract_number, status, client_id, clients(company_name)")
      .in("status", ["sent", "viewed"])
      .limit(5),
  ]);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atenção necessária</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {(!overdueTasks || overdueTasks.length === 0) && (!pendingContracts || pendingContracts.length === 0) ? (
            <p className="text-sm text-muted-foreground">Tudo sob controle por aqui.</p>
          ) : (
            <>
              {overdueTasks?.map((t) => {
                const clientName = Array.isArray(t.clients)
                  ? (t.clients[0] as { company_name?: string } | undefined)?.company_name
                  : (t.clients as { company_name?: string } | null)?.company_name;
                return (
                  <Link
                    key={t.id}
                    href={`/clients/${t.client_id}/tasks`}
                    className="flex items-start justify-between gap-3 p-3 rounded-md border border-border hover:bg-accent"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground">{clientName}</div>
                    </div>
                    <Badge variant="destructive">Atrasada</Badge>
                  </Link>
                );
              })}
              {pendingContracts?.map((c) => {
                const clientName = Array.isArray(c.clients)
                  ? (c.clients[0] as { company_name?: string } | undefined)?.company_name
                  : (c.clients as { company_name?: string } | null)?.company_name;
                return (
                  <Link
                    key={c.id}
                    href={`/contracts/${c.id}`}
                    className="flex items-start justify-between gap-3 p-3 rounded-md border border-border hover:bg-accent"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.contract_number}</div>
                      <div className="text-xs text-muted-foreground">
                        {clientName} · aguardando assinatura
                      </div>
                    </div>
                    <Badge variant="warning">Contrato</Badge>
                  </Link>
                );
              })}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Atividades recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentActivity || recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada.</p>
          ) : (
            <ol className="space-y-3">
              {recentActivity.map((a) => {
                const clientName = Array.isArray(a.clients)
                  ? (a.clients[0] as { company_name?: string } | undefined)?.company_name
                  : (a.clients as { company_name?: string } | null)?.company_name;
                return (
                  <li key={a.id} className="flex items-start gap-3 text-sm">
                    <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{a.description}</div>
                      <div className="text-xs text-muted-foreground">
                        {clientName} · {formatRelativeTime(a.created_at)}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
