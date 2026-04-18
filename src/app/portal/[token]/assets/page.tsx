import { requireClientByToken } from "@/lib/services/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClientAssetUploader } from "@/components/portal/client-asset-uploader";
import { ASSET_CATEGORIES } from "@/lib/utils/constants";
import { formatDate } from "@/lib/utils/format";
import Link from "next/link";

export default async function PortalAssetsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const client = await requireClientByToken(token);
  const supabase = createAdminClient();

  const [{ data: clientAssets }, { data: pendingApprovals }] = await Promise.all([
    supabase
      .from("client_assets")
      .select("*")
      .eq("client_id", client.id)
      .eq("uploaded_by_client", true)
      .order("created_at", { ascending: false }),
    supabase
      .from("client_assets")
      .select("id")
      .eq("client_id", client.id)
      .eq("approval_status", "pending"),
  ]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h1 className="text-xl font-semibold">Materiais</h1>
        <p className="text-sm text-slate-500 mt-1">
          Envie logos, fotos e vídeos do seu negócio para usarmos nas campanhas.
        </p>
      </div>

      {pendingApprovals && pendingApprovals.length > 0 && (
        <Link href={`/portal/${token}/approvals`} className="block">
          <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4 flex items-center justify-between">
            <div>
              <div className="font-medium">{pendingApprovals.length} criativo(s) aguardando sua aprovação</div>
              <div className="text-xs">Clique para revisar.</div>
            </div>
            <span>→</span>
          </div>
        </Link>
      )}

      <ClientAssetUploader token={token} />

      <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
        <h2 className="font-semibold mb-3">Arquivos que você já enviou</h2>
        {!clientAssets || clientAssets.length === 0 ? (
          <p className="text-sm text-slate-500">Nenhum arquivo enviado ainda.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {clientAssets.map((a) => {
              const isImage = a.file_type?.startsWith("image/");
              return (
                <div key={a.id} className="border border-slate-200 rounded-lg overflow-hidden">
                  <div className="aspect-square bg-slate-50 flex items-center justify-center">
                    {isImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={a.thumbnail_url ?? a.file_url} alt={a.file_name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-3xl">
                        {ASSET_CATEGORIES[a.category as keyof typeof ASSET_CATEGORIES]?.emoji ?? "📄"}
                      </span>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-xs font-medium truncate">{a.file_name}</div>
                    <div className="text-[10px] text-slate-500">{formatDate(a.created_at)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
