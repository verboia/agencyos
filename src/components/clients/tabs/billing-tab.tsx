import { Card, CardContent } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { ClientBillingOverview } from "@/components/billing/client-billing-overview";

export async function ClientBillingTab({ clientId }: { clientId: string }) {
  const supabase = await createServerClient();
  const [{ data: billing }, { data: invoices }] = await Promise.all([
    supabase.from("client_billing").select("*").eq("client_id", clientId).maybeSingle(),
    supabase
      .from("billing_invoices")
      .select("*")
      .eq("client_id", clientId)
      .order("due_date", { ascending: false })
      .limit(50),
  ]);

  if (!billing) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-sm text-muted-foreground">
          Este cliente ainda não tem cobrança configurada. A configuração é criada automaticamente quando o contrato é assinado.
        </CardContent>
      </Card>
    );
  }

  return <ClientBillingOverview billing={billing} invoices={invoices ?? []} />;
}
