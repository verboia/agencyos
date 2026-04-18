import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils/format";

export default async function PackagesPage() {
  const supabase = await createServerClient();
  const { data: packages } = await supabase
    .from("service_packages")
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
          <h1 className="text-2xl font-semibold tracking-tight">Pacotes</h1>
          <p className="text-sm text-muted-foreground">Combinações prontas para acelerar a venda.</p>
        </div>
      </div>

      <div className="grid gap-3">
        {packages?.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="text-xs text-muted-foreground">{p.description}</p>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold">{formatCurrency(p.package_price)}</div>
                <div className="text-xs text-muted-foreground">/mês</div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
