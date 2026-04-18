"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/client";
import { formatRelativeTime } from "@/lib/utils/format";
import type { Notification } from "@/types/database";

export function NotificationsBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const supabase = createClient();
    let mounted = true;

    async function load() {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);
      if (mounted && data) setNotifications(data as Notification[]);
    }

    load();

    const channel = supabase
      .channel("notifications")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, () => {
        load();
      })
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  async function markAllRead() {
    const supabase = createClient();
    await supabase.from("notifications").update({ read: true }).eq("read", false);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-[10px] font-semibold"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <span className="font-semibold text-sm">Notificações</span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-primary hover:underline"
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              Nada por aqui ainda.
            </div>
          ) : (
            notifications.map((n) => {
              const Wrapper = n.link ? Link : "div";
              const props = n.link ? { href: n.link } : {};
              return (
                // @ts-expect-error dynamic wrapper
                <Wrapper
                  {...props}
                  key={n.id}
                  className={`block p-3 border-b border-border hover:bg-accent ${!n.read ? "bg-primary/5" : ""}`}
                >
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-xs text-muted-foreground mt-1">{n.body}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatRelativeTime(n.created_at)}
                  </div>
                </Wrapper>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
