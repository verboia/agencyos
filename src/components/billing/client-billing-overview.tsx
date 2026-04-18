import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { INVOICE_STATUS } from "@/lib/utils/constants";
import type { BillingInvoice, ClientBilling } from "@/types/database";

interface Props {
  billing: ClientBilling;
  invoices: BillingInvoice[];
}

export function ClientBillingOverview({ billing, invoices }: Props) {
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground">Mensalidade</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{formatCurrency(billing.monthly_value)}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground">Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold capitalize">{billing.subscription_status}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-normal text-muted-foreground">Método</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{billing.payment_method}</CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Histórico de cobranças</CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ainda não há cobranças emitidas.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => {
                const cfg = INVOICE_STATUS[inv.status as keyof typeof INVOICE_STATUS];
                return (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between gap-4 p-3 rounded-md border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{inv.description ?? "Cobrança"}</div>
                      <div className="text-xs text-muted-foreground">
                        Venc. {formatDate(inv.due_date)}
                        {inv.paid_at && ` · Pago ${formatDate(inv.paid_at)}`}
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-sm font-semibold">{formatCurrency(inv.net_value)}</div>
                      <Badge variant="outline">{cfg?.label ?? inv.status}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
