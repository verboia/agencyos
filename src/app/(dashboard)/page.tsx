import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ListChecks, Wallet, CircleAlert } from "lucide-react";
import { getCurrentUser } from "@/lib/services/current-user";
import { createServerClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/utils/format";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { OperatorDashboard } from "@/components/dashboard/operator-dashboard";

export default async function DashboardPage() {
  const session = await getCurrentUser();
  const supabase = await createServerClient();

  const [{ count: clientsActive }, { count: tasksPending }, { count: clientsOnboarding }, { data: mrrData }] =
    await Promise.all([
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "active"),
      supabase.from("tasks").select("*", { count: "exact", head: true }).in("status", ["pending", "in_progress"]),
      supabase.from("clients").select("*", { count: "exact", head: true }).eq("status", "onboarding"),
      supabase.from("clients").select("monthly_fee").in("status", ["active", "onboarding"]),
    ]);

  const mrr = (mrrData ?? []).reduce((sum, c) => sum + Number(c.monthly_fee || 0), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Olá, {session?.profile?.full_name ?? "visitante"}. Veja o que precisa de atenção hoje.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
              <Wallet className="h-4 w-4" /> MRR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{formatCurrency(mrr)}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ListChecks className="h-4 w-4" /> Tarefas pendentes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{tasksPending ?? 0}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <CircleAlert className="h-4 w-4" /> Em onboarding
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-3xl">{clientsOnboarding ?? 0}</CardTitle>
          </CardContent>
        </Card>
      </div>

      {session?.profile?.role === "admin" ? <AdminDashboard /> : <OperatorDashboard userId={session?.profile?.id ?? ""} />}
    </div>
  );
}
