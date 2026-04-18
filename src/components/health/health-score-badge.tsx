import { Badge } from "@/components/ui/badge";
import { HEALTH_STATUS } from "@/lib/utils/constants";
import type { HealthStatus } from "@/types/database";

export function HealthScoreBadge({ score, status }: { score: number; status: HealthStatus }) {
  const cfg = HEALTH_STATUS[status];
  const variant = status === "healthy" ? "success" : status === "attention" ? "warning" : "destructive";
  return (
    <Badge variant={variant}>
      {cfg.emoji} {score}
    </Badge>
  );
}
