import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, AlertCircle, TrendingUp, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { InvoicesList } from "@/components/billing/invoices-list";
import { CreateInvoiceDialogTrigger } from "@/components/billing/create-invoice-dialog";

export default async function BillingPage() {
  const supabase = await createServerClient();
  const startMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

  const [{ data: clients }, { data: invoices }] = await Promise.all([
    supabase.from("clients").select("id, monthly_fee, company_name, status").in("status", ["active", "onboarding"]),
    supabase
      .from("billing_invoices")
      .select("*, client:clients(company_name)")
      .order("due_date", { ascending: false })
      .limit(80),
  ]);

  const mrr = (clients ?? []).reduce((sum, c) => sum + Number(c.monthly_fee || 0), 0);
  const monthInvoices = (invoices ?? []).filter((i) => i.due_date >= startMonth);
  const received = monthInvoices.filter((i) => i.status === "received").reduce((sum, i) => sum + Number(i.net_value), 0);
  const pending = monthInvoices.filter((i) => i.status === "pending").reduce((sum, i) => sum + Number(i.gross_value), 0);
  const overdue = (invoices ?? [])
    .filter((i) => i.status === "overdue")
    .reduce((sum, i) => sum + Number(i.gross_value), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
          <p className="text-sm text-muted-foreground">MRR, cobranças e inadimplência.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/billing/forecast">
              <TrendingUp className="h-4 w-4" /> Forecast
            </Link>
          </Button>
          <CreateInvoiceDialogTrigger clients={clients ?? []} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Wallet className="h-4 w-4" /> MRR
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{formatCurrency(mrr)}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Recebido no mês</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl text-green-500">{formatCurrency(received)}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>A receber</CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl">{formatCurrency(pending)}</CardTitle>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> Inadimplência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CardTitle className="text-2xl text-destructive">{formatCurrency(overdue)}</CardTitle>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cobranças recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoicesList invoices={invoices ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
