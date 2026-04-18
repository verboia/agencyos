import { UserMenu } from "./user-menu";
import { NotificationsBell } from "./notifications-bell";
import type { Profile } from "@/types/database";

export function Header({ profile }: { profile: Profile | null }) {
  return (
    <header className="h-16 border-b border-border bg-card flex items-center justify-between px-4 md:px-6 shrink-0">
      <div className="md:hidden flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-adria flex items-center justify-center text-white font-bold text-sm">
          A
        </div>
        <span className="font-semibold">AgencyOS</span>
      </div>
      <div className="hidden md:block" />
      <div className="flex items-center gap-2">
        <NotificationsBell />
        <UserMenu profile={profile} />
      </div>
    </header>
  );
}
