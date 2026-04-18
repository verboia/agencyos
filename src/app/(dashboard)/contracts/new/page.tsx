import { createServerClient } from "@/lib/supabase/server";
import { ContractBuilder } from "@/components/contracts/contract-builder";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams: Promise<{ client_id?: string }>;
}) {
  const { client_id } = await searchParams;
  const supabase = await createServerClient();

  const [{ data: clients }, { data: services }, { data: packages }] = await Promise.all([
    supabase.from("clients").select("id, company_name").order("company_name"),
    supabase.from("service_catalog").select("*").eq("is_active", true).order("sort_order"),
    supabase.from("service_packages").select("*").eq("is_active", true).order("sort_order"),
  ]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contracts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo contrato</h1>
          <p className="text-sm text-muted-foreground">Monte o contrato do cliente serviço a serviço.</p>
        </div>
      </div>
      <ContractBuilder
        clients={clients ?? []}
        services={services ?? []}
        packages={packages ?? []}
        defaultClientId={client_id}
      />
    </div>
  );
}
