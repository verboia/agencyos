import { notFound } from "next/navigation";
import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, Copy, ExternalLink } from "lucide-react";
import { ClientStatusBadge } from "@/components/clients/client-status-badge";
import { formatCurrency, formatPhone, formatDate } from "@/lib/utils/format";
import { APP_URL } from "@/lib/utils/constants";
import { ClientOverviewTab } from "@/components/clients/tabs/overview-tab";
import { ClientTasksTab } from "@/components/clients/tabs/tasks-tab";
import { ClientBriefingTab } from "@/components/clients/tabs/briefing-tab";
import { ClientContractTab } from "@/components/clients/tabs/contract-tab";
import { ClientBillingTab } from "@/components/clients/tabs/billing-tab";
import { ClientReportsTab } from "@/components/clients/tabs/reports-tab";
import { ClientAssetsTab } from "@/components/clients/tabs/assets-tab";
import { ClientIntegrationsTab } from "@/components/clients/tabs/integrations-tab";
import { ClientSettingsTab } from "@/components/clients/tabs/settings-tab";
import { PortalLinkButton } from "@/components/clients/portal-link-button";
import { DeleteClientButton } from "@/components/clients/delete-client-button";

export default async function ClientDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerClient();
  const { data: client } = await supabase
    .from("clients")
    .select("*, assigned_profile:profiles!clients_assigned_to_fkey(full_name)")
    .eq("id", id)
    .maybeSingle();

  if (!client) notFound();

  const portalUrl = `${APP_URL}/portal/${client.public_token}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/clients">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-semibold tracking-tight">{client.company_name}</h1>
              <ClientStatusBadge status={client.status} />
            </div>
            <p className="text-sm text-muted-foreground">
              {client.contact_name} · {formatPhone(client.contact_phone)}
              {client.segment && ` · ${client.segment}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <PortalLinkButton url={portalUrl} />
          <DeleteClientButton clientId={client.id} clientName={client.company_name} />
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">Valor mensal</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrency(client.monthly_fee)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">Contrato</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{client.contract_months} meses</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">Início</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {client.contract_start ? formatDate(client.contract_start) : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground font-normal">Responsável</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {client.assigned_profile?.full_name ?? "—"}
          </CardContent>
        </Card>
      </div>

      {client.status === "onboarding" && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="font-medium">Progresso de onboarding</span>
              <span className="text-muted-foreground">{client.onboarding_progress}%</span>
            </div>
            <Progress value={client.onboarding_progress} />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full overflow-x-auto justify-start">
          <TabsTrigger value="overview">Visão geral</TabsTrigger>
          <TabsTrigger value="tasks">Tarefas</TabsTrigger>
          <TabsTrigger value="briefing">Briefing</TabsTrigger>
          <TabsTrigger value="contract">Contrato</TabsTrigger>
          <TabsTrigger value="billing">Financeiro</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
          <TabsTrigger value="assets">Assets</TabsTrigger>
          <TabsTrigger value="integrations">Integrações</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>
        <TabsContent value="overview" className="mt-6">
          <ClientOverviewTab clientId={id} />
        </TabsContent>
        <TabsContent value="tasks" className="mt-6">
          <ClientTasksTab clientId={id} />
        </TabsContent>
        <TabsContent value="briefing" className="mt-6">
          <ClientBriefingTab clientId={id} />
        </TabsContent>
        <TabsContent value="contract" className="mt-6">
          <ClientContractTab clientId={id} />
        </TabsContent>
        <TabsContent value="billing" className="mt-6">
          <ClientBillingTab clientId={id} />
        </TabsContent>
        <TabsContent value="reports" className="mt-6">
          <ClientReportsTab clientId={id} />
        </TabsContent>
        <TabsContent value="assets" className="mt-6">
          <ClientAssetsTab clientId={id} />
        </TabsContent>
        <TabsContent value="integrations" className="mt-6">
          <ClientIntegrationsTab clientId={id} />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <ClientSettingsTab client={client} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
