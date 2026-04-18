import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TASK_PRIORITY } from "@/lib/utils/constants";
import { formatDate } from "@/lib/utils/format";
import { Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Task } from "@/types/database";

type TaskWithRelations = Task & {
  assigned_profile?: { full_name: string } | null;
  client?: { company_name: string } | null;
};

export function TaskCard({ task, showClient = true }: { task: TaskWithRelations; showClient?: boolean }) {
  const isOverdue =
    task.due_date && task.status !== "done" && new Date(task.due_date) < new Date(new Date().toDateString());
  const priorityConfig = TASK_PRIORITY[task.priority as keyof typeof TASK_PRIORITY];

  return (
    <Card className={cn("p-3 space-y-2 hover:shadow-md cursor-grab active:cursor-grabbing", isOverdue && "border-destructive/50")}>
      <div className="flex items-start justify-between gap-2">
        {task.priority === "urgent" || isOverdue ? (
          <Badge variant="destructive" className="text-[10px]">
            {isOverdue ? "ATRASADA" : "URGENTE"}
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[10px]">
            {priorityConfig?.label ?? task.priority}
          </Badge>
        )}
      </div>
      <div className="text-sm font-medium leading-snug">{task.title}</div>
      {showClient && task.client?.company_name && (
        <div className="text-xs text-muted-foreground">{task.client.company_name}</div>
      )}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1 truncate">
          <User className="h-3 w-3 shrink-0" />
          <span className="truncate">{task.assigned_profile?.full_name ?? "—"}</span>
        </span>
        {task.due_date && (
          <span className={cn("flex items-center gap-1 shrink-0", isOverdue && "text-destructive font-medium")}>
            <Calendar className="h-3 w-3" />
            {formatDate(task.due_date)}
          </span>
        )}
      </div>
    </Card>
  );
}
