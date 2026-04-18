import { requireClientByToken } from "@/lib/services/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatDate } from "@/lib/utils/format";
import { INVOICE_STATUS } from "@/lib/utils/constants";

export default async function PortalBillingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await requireClientByToken(token);
  const supabase = createAdminClient();

  const [{ data: billing }, { data: invoices }] = await Promise.all([
    supabase.from("client_billing").select("*").eq("client_id", client.id).maybeSingle(),
    supabase
      .from("billing_invoices")
      .select("*")
      .eq("client_id", client.id)
      .order("due_date", { ascending: false })
      .limit(20),
  ]);

  const nextInvoice = invoices?.find((i) => i.status === "pending" || i.status === "overdue");
  const paidInvoices = invoices?.filter((i) => i.status === "received" || i.status === "confirmed") ?? [];

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h1 className="text-xl font-semibold">Financeiro</h1>
        <p className="text-sm text-slate-500 mt-1">Acompanhe suas faturas e pagamentos.</p>
      </div>

      {nextInvoice && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <div className="text-xs text-slate-500">Próxima fatura</div>
          <div className="text-3xl font-bold text-adria mt-1">{formatCurrency(nextInvoice.gross_value)}</div>
          <div className="text-sm text-slate-600 mt-1">Vencimento: {formatDate(nextInvoice.due_date)}</div>
          {nextInvoice.pix_qr_code && (
            <div className="mt-4 flex flex-col items-center gap-3 p-4 bg-slate-50 rounded-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`data:image/png;base64,${nextInvoice.pix_qr_code}`}
                alt="QR Code PIX"
                className="w-48 h-48"
              />
              {nextInvoice.pix_copy_paste && (
                <div className="w-full">
                  <div className="text-xs text-slate-500 mb-1">PIX copia e cola</div>
                  <code className="block text-xs bg-white border border-slate-200 rounded p-2 break-all">
                    {nextInvoice.pix_copy_paste}
                  </code>
                </div>
              )}
            </div>
          )}
          {nextInvoice.payment_url && (
            <a
              href={nextInvoice.payment_url}
              target="_blank"
              rel="noreferrer"
              className="block mt-3 text-center bg-adria text-white py-2.5 rounded-md font-medium hover:bg-adria/90"
            >
              Abrir fatura
            </a>
          )}
        </div>
      )}

      {billing && (
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
          <h2 className="font-semibold mb-3">Sua assinatura</h2>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="text-xs text-slate-500">Mensalidade</div>
              <div className="font-medium">{formatCurrency(billing.monthly_value)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Status</div>
              <div className="font-medium capitalize">{billing.subscription_status}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Método</div>
              <div className="font-medium">{billing.payment_method}</div>
            </div>
            <div>
              <div className="text-xs text-slate-500">Vencimento</div>
              <div className="font-medium">Dia {billing.due_day}</div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="font-semibold mb-3">Histórico</h2>
        {paidInvoices.length === 0 ? (
          <p className="text-sm text-slate-500">Ainda não há pagamentos registrados.</p>
        ) : (
          <div className="space-y-2">
            {paidInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-3 rounded-md bg-slate-50">
                <div>
                  <div className="text-sm font-medium">{inv.description ?? "Mensalidade"}</div>
                  <div className="text-xs text-slate-500">
                    Pago em {inv.paid_at ? formatDate(inv.paid_at) : formatDate(inv.due_date)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatCurrency(inv.net_value)}</div>
                  <div className="text-xs text-green-600">
                    {INVOICE_STATUS[inv.status as keyof typeof INVOICE_STATUS]?.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
