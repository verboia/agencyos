import { createServerClient } from "@/lib/supabase/server";
import { AssetsManager } from "@/components/assets/assets-manager";

export async function ClientAssetsTab({ clientId }: { clientId: string }) {
  const supabase = await createServerClient();
  const { data: assets } = await supabase
    .from("client_assets")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });

  return <AssetsManager clientId={clientId} assets={assets ?? []} />;
}
