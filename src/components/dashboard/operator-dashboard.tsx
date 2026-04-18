import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/format";
import { TASK_PRIORITY } from "@/lib/utils/constants";

export async function OperatorDashboard({ userId }: { userId: string }) {
  const supabase = await createServerClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: myToday }, { data: myWeek }, { data: myClients }] = await Promise.all([
    supabase
      .from("tasks")
      .select("id, title, priority, due_date, status, client_id, clients(company_name)")
      .eq("assigned_to", userId)
      .in("status", ["pending", "in_progress"])
      .lte("due_date", today)
      .order("due_date", { ascending: true }),
    supabase
      .from("tasks")
      .select("id, title, priority, due_date, status, client_id, clients(company_name)")
      .eq("assigned_to", userId)
      .in("status", ["pending", "in_progress"])
      .gte("due_date", today)
      .order("due_date", { ascending: true })
      .limit(20),
    supabase
      .from("clients")
      .select("id, company_name, status, onboarding_progress")
      .eq("assigned_to", userId)
      .in("status", ["onboarding", "active"])
      .limit(8),
  ]);

  const getClientName = (t: { clients: unknown }) => {
    if (Array.isArray(t.clients)) return (t.clients[0] as { company_name?: string } | undefined)?.company_name;
    return (t.clients as { company_name?: string } | null)?.company_name;
  };

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meu dia</CardTitle>
        </CardHeader>
        <CardContent>
          {!myToday || myToday.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nada pra hoje. 🎉</p>
          ) : (
            <div className="space-y-2">
              {myToday.map((t) => (
                <Link
                  key={t.id}
                  href={`/clients/${t.client_id}/tasks`}
                  className="flex items-center justify-between gap-3 p-3 rounded-md border border-border hover:bg-accent"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {getClientName(t)} · {formatDate(t.due_date)}
                    </div>
                  </div>
                  <Badge className={TASK_PRIORITY[t.priority as keyof typeof TASK_PRIORITY]?.color}>
                    {TASK_PRIORITY[t.priority as keyof typeof TASK_PRIORITY]?.label}
                  </Badge>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Meus clientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {!myClients || myClients.length === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não é responsável por clientes.</p>
          ) : (
            myClients.map((c) => (
              <Link
                key={c.id}
                href={`/clients/${c.id}`}
                className="flex items-center justify-between gap-3 p-3 rounded-md border border-border hover:bg-accent"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{c.company_name}</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {c.status} · {c.onboarding_progress}% onboarding
                  </div>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Minha semana</CardTitle>
        </CardHeader>
        <CardContent>
          {!myWeek || myWeek.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem tarefas futuras atribuídas.</p>
          ) : (
            <div className="space-y-2">
              {myWeek.map((t) => (
                <Link
                  key={t.id}
                  href={`/clients/${t.client_id}/tasks`}
                  className="flex items-center justify-between gap-3 p-3 rounded-md border border-border hover:bg-accent"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {getClientName(t)} · {formatDate(t.due_date)}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
