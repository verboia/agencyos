export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientByToken } from "@/lib/services/portal-auth";
import { ContractDocument } from "@/lib/contracts/pdf-document";
import type { Contract, ContractService } from "@/types/database";

export async function GET(_req: NextRequest, { params }: { params: { token: string } }) {
  const client = await getClientByToken(params.token);
  if (!client) {
    return NextResponse.json({ error: "cliente não encontrado" }, { status: 404 });
  }

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
    return NextResponse.json({ error: "contrato não encontrado" }, { status: 404 });
  }

  const { data: services } = await supabase
    .from("contract_services")
    .select("*")
    .eq("contract_id", contract.id)
    .order("sort_order");

  const buffer = await renderToBuffer(
    ContractDocument({
      contract: contract as Contract,
      services: (services ?? []) as ContractService[],
      clientCompanyName: client.company_name ?? "CONTRATANTE",
    })
  );

  const filename = `${String(contract.contract_number).replace(/[^a-zA-Z0-9_-]/g, "-")}.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
