import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createServerClient } from "@/lib/supabase/server";
import { formatRelativeTime } from "@/lib/utils/format";

export async function ClientOverviewTab({ clientId }: { clientId: string }) {
  const supabase = await createServerClient();
  const { data: activity } = await supabase
    .from("activity_log")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Timeline de atividades</CardTitle>
      </CardHeader>
      <CardContent>
        {!activity || activity.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda.</p>
        ) : (
          <ol className="space-y-3">
            {activity.map((a) => (
              <li key={a.id} className="flex items-start gap-3 text-sm">
                <span className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div>{a.description}</div>
                  <div className="text-xs text-muted-foreground">{formatRelativeTime(a.created_at)}</div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
