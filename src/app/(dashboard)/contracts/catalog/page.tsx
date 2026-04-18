import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";
import { ServiceCatalogManager } from "@/components/contracts/service-catalog-manager";

export default async function CatalogPage() {
  const supabase = await createServerClient();
  const { data: services } = await supabase
    .from("service_catalog")
    .select("*")
    .order("sort_order");

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/contracts">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Catálogo de serviços</h1>
          <p className="text-sm text-muted-foreground">Serviços disponíveis para contratos e propostas.</p>
        </div>
      </div>
      <ServiceCatalogManager services={services ?? []} />
    </div>
  );
}
