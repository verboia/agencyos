import { notFound } from "next/navigation";
import { requireClientByToken } from "@/lib/services/portal-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { ReportPublicViewer } from "@/components/portal/report-public-viewer";

export default async function PortalReportPage({
  params,
}: {
  params: Promise<{ token: string; reportId: string }>;
}) {
  const { token, reportId } = await params;
  const client = await requireClientByToken(token);
  const supabase = createAdminClient();

  const { data: report } = await supabase
    .from("performance_reports")
    .select("*")
    .eq("id", reportId)
    .eq("client_id", client.id)
    .eq("visible_to_client", true)
    .maybeSingle();

  if (!report) notFound();

  return <ReportPublicViewer report={report} />;
}
