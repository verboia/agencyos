import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ListChecks, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/services/current-user";
import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/format";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { OperatorDashboard } from "@/components/dashboard/operator-dashboard";
import { TrafficOpsTable } from "@/components/dashboard/traffic-ops-table";

interface IntegrationMetadata {
  spend_cap?: number | null;
  amount_spent?: number | null;
}

export default async function DashboardPage() {
  const session = await getCurrentUser();
  const supabase = await createServerClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const [{ count: clientsActive }, { count: overdueTasks }, { data: integrations }] =
    await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .in("status", ["pending", "in_progress", "blocked"])
        .lt("due_date", todayStr),
      supabase
        .from("ad_integrations")
        .select("metadata")
        .eq("platform", "meta")
        .eq("status", "connected"),
    ]);

  const totalAvailableBalance = (integrations ?? []).reduce((sum, row) => {
    const md = (row.metadata ?? {}) as IntegrationMetadata;
    const spendCap = typeof md.spend_cap === "number" ? md.spend_cap : null;
    const amountSpent = typeof md.amount_spent === "number" ? md.amount_spent : null;
    if (spendCap === null || spendCap <= 0 || amountSpent === null) return sum;
    return sum + Math.max(spendCap - amountSpent, 0);
  }, 0);

  const isAdmin = session?.profile?.role === "admin";

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Olá, {session?.profile?.full_name ?? "visitante"}. Situação de tráfego dos clientes agora.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Users className="h-4 w-4" /> Clientes ativos
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{clientsActive ?? 0}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Tarefas atrasadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className={`text-3xl ${(overdueTasks ?? 0) > 0 ? "text-red-600" : ""}`}>
              {overdueTasks ?? 0}
            </CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Saldo Meta disponível
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{formatCurrency(totalAvailableBalance)}</CardTitle>
          </CardContent>
        </Card>
      </div>

      {isAdmin && <TrafficOpsTable />}

      {isAdmin ? <AdminDashboard /> : <OperatorDashboard userId={session?.profile?.id ?? ""} />}
    </div>
  );
}
