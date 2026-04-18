import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { AsaasConfigForm } from "@/components/billing/asaas-config-form";

export default async function BillingSettingsPage() {
  const supabase = await createServerClient();
  const { data: config } = await supabase.from("billing_config").select("*").limit(1).maybeSingle();

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Configurações de cobrança</h1>
          <p className="text-sm text-muted-foreground">Integração com Asaas e régua de cobrança.</p>
        </div>
      </div>
      <AsaasConfigForm config={config} />
    </div>
  );
}
