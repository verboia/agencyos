import { ClientForm } from "@/components/clients/client-form";
import { createServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NewClientPage() {
  const supabase = await createServerClient();
  const { data: profiles } = await supabase.from("profiles").select("*").order("full_name");

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/clients">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novo cliente</h1>
          <p className="text-sm text-muted-foreground">
            Ao cadastrar, o sistema gera tarefas de onboarding e link do portal.
          </p>
        </div>
      </div>
      <ClientForm profiles={profiles ?? []} />
    </div>
  );
}
