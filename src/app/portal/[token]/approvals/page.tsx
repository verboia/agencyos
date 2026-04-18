import { requireClientByToken } from "@/lib/services/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ApprovalQueue } from "@/components/portal/approval-queue";

export default async function PortalApprovalsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await requireClientByToken(token);
  const supabase = createAdminClient();

  const { data: assets } = await supabase
    .from("client_assets")
    .select("*")
    .eq("client_id", client.id)
    .eq("approval_status", "pending")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h1 className="text-xl font-semibold">Aprovações</h1>
        <p className="text-sm text-slate-500 mt-1">Aprove os criativos que a equipe preparou para você.</p>
      </div>
      <ApprovalQueue token={token} assets={assets ?? []} />
    </div>
  );
}
