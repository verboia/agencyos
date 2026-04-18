import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ClientsTable } from "@/components/clients/clients-table";

export default async function ClientsPage() {
  const supabase = await createServerClient();
  const { data: clients } = await supabase
    .from("clients")
    .select("*, assigned_profile:profiles!clients_assigned_to_fkey(full_name)")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {(clients?.length ?? 0)} cliente(s) cadastrado(s)
          </p>
        </div>
        <Button asChild>
          <Link href="/clients/new">
            <Plus className="h-4 w-4" /> Novo cliente
          </Link>
        </Button>
      </div>

      <ClientsTable clients={clients ?? []} />
    </div>
  );
}
