import Link from "next/link";
import { createServerClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { TeamManager } from "@/components/settings/team-manager";
import { getCurrentUser } from "@/lib/services/current-user";

export default async function TeamSettingsPage() {
  const session = await getCurrentUser();
  const supabase = await createServerClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: true });

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Equipe</h1>
          <p className="text-sm text-muted-foreground">Gerencie os membros da agência.</p>
        </div>
      </div>
      <TeamManager
        profiles={profiles ?? []}
        currentUserId={session?.profile?.id ?? ""}
        canManage={session?.profile?.role === "admin"}
      />
    </div>
  );
}
