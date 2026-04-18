import { Badge } from "@/components/ui/badge";
import { CLIENT_STATUS } from "@/lib/utils/constants";
import type { ClientStatus } from "@/types/database";

export function ClientStatusBadge({ status }: { status: ClientStatus }) {
  const config = CLIENT_STATUS[status];
  if (!config) return <Badge variant="outline">{status}</Badge>;
  const variantMap: Record<ClientStatus, "default" | "success" | "warning" | "destructive"> = {
    onboarding: "default",
    active: "success",
    paused: "warning",
    churned: "destructive",
  };
  return <Badge variant={variantMap[status]}>{config.label}</Badge>;
}
