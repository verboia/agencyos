import { createServerClient } from "@/lib/supabase/server";
import { ProposalBuilder } from "@/components/proposals/proposal-builder";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewProposalPage() {
  const supabase = await createServerClient();
  const { data: services } = await supabase
    .from("service_catalog")
    .select("*")
    .eq("is_active", true)
    .order("sort_order");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/proposals">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Nova proposta</h1>
          <p className="text-sm text-muted-foreground">Crie uma proposta visual para enviar ao prospect.</p>
        </div>
      </div>
      <ProposalBuilder services={services ?? []} />
    </div>
  );
}
