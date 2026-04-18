export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { requireUser } from "@/lib/services/current-user";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ContractDocument } from "@/lib/contracts/pdf-document";
import type { Contract, ContractService } from "@/types/database";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireUser();
  if (!session.organizationId) {
    return NextResponse.json({ error: "organização não encontrada" }, { status: 403 });
  }

  const supabase = await createServerClient();
  const { data: contract, error: contractError } = await supabase
    .from("contracts")
    .select("*, client:clients(id, company_name)")
    .eq("id", params.id)
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (contractError || !contract) {
    return NextResponse.json({ error: "contrato não encontrado" }, { status: 404 });
  }

  const { data: services } = await supabase
    .from("contract_services")
    .select("*")
    .eq("contract_id", params.id)
    .order("sort_order");

  const client = Array.isArray(contract.client) ? contract.client[0] : contract.client;
  const clientCompanyName = client?.company_name ?? "CONTRATANTE";

  const buffer = await renderToBuffer(
    ContractDocument({
      contract: contract as Contract,
      services: (services ?? []) as ContractService[],
      clientCompanyName,
    })
  );

  const admin = createAdminClient();
  const filename = `${contract.contract_number.replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;
  const storagePath = `${contract.id}/${filename}`;

  const { error: uploadError } = await admin.storage
    .from("contracts")
    .upload(storagePath, buffer, {
      contentType: "application/pdf",
      upsert: true,
      cacheControl: "60",
    });

  if (!uploadError) {
    const { data: publicUrl } = admin.storage.from("contracts").getPublicUrl(storagePath);
    await admin
      .from("contracts")
      .update({
        pdf_url: publicUrl.publicUrl,
        pdf_generated_at: new Date().toISOString(),
      })
      .eq("id", contract.id);
  } else {
    console.error("Falha ao enviar PDF para o Storage:", uploadError);
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
