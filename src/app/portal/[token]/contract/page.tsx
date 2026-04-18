import { notFound } from "next/navigation";
import { requireClientByToken } from "@/lib/services/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContractAcceptFlow } from "@/components/portal/contract-accept-flow";

export default async function PortalContractPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await requireClientByToken(token);
  const supabase = createAdminClient();

  const { data: contracts } = await supabase
    .from("contracts")
    .select("*")
    .eq("client_id", client.id)
    .in("status", ["sent", "viewed", "signed"])
    .order("created_at", { ascending: false })
    .limit(1);

  const contract = contracts?.[0];
  if (!contract) {
    return (
      <div className="bg-white rounded-xl p-8 shadow-sm border border-slate-200 text-center space-y-3">
        <div className="text-4xl">📄</div>
        <h1 className="text-xl font-semibold">Nenhum contrato disponível ainda</h1>
        <p className="text-sm text-slate-600">
          Assim que a equipe da Adria preparar o contrato, ele aparecerá aqui para seu aceite.
        </p>
      </div>
    );
  }

  const { data: services } = await supabase
    .from("contract_services")
    .select("*")
    .eq("contract_id", contract.id)
    .order("sort_order");

  return <ContractAcceptFlow token={token} contract={contract} services={services ?? []} />;
}
