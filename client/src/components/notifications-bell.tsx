import { useContext, useEffect, useState } from "react";
import { Bell, Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LangContext } from "@/lib/i18n";
import { useAuth } from "@/components/auth-gate";

interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  link: string | null;
  is_read: number;
  created_at: number;
}

function fmtDate(ts: number, isAr: boolean) {
  try {
    const d = new Date(ts);
    return d.toLocaleString(isAr ? "ar-SA" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function NotificationsBell() {
  const { user, authEnabled } = useAuth();
  const { lang } = useContext(LangContext);
  const isAr = lang === "ar";
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (!authEnabled || !user) return;
    try {
      const r = await fetch("/api/notifications");
      if (r.ok) {
        const d = await r.json();
        setItems(d.notifications || []);
        setUnread(d.unread || 0);
      }
    } catch {}
  };

  useEffect(() => {
    if (!authEnabled || !user) return;
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [authEnabled, user?.id]);

  const markRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: "PATCH" });
    load();
  };
  const markAll = async () => {
    await fetch(`/api/notifications/read-all`, { method: "PATCH" });
    load();
  };
  const del = async (id: number) => {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    load();
  };

  if (!authEnabled || !user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title={isAr ? "الإشعارات" : "Notifications"}>
          <Bell className="w-4 h-4" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align={isAr ? "start" : "end"}>
        <div className="flex items-center justify-between p-3 border-b">
          <div className="font-semibold text-sm">{isAr ? "الإشعارات" : "Notifications"}</div>
          {unread > 0 && (
            <Button variant="ghost" size="sm" onClick={markAll} className="h-7 text-xs">
              <Check className="w-3 h-3 me-1" />
              {isAr ? "قراءة الكل" : "Mark all read"}
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-96">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              {isAr ? "لا توجد إشعارات" : "No notifications"}
            </div>
          ) : (
            <div className="divide-y">
              {items.map((n) => (
                <div
                  key={n.id}
                  className={`p-3 hover:bg-accent/50 transition-colors ${
                    !n.is_read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{n.title}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{n.message}</div>
                      <div className="text-[10px] text-muted-foreground/70 mt-1">
                        {fmtDate(n.created_at, isAr)}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!n.is_read && (
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markRead(n.id)} title={isAr ? "تمييز كمقروء" : "Mark read"}>
                          <Check className="w-3 h-3" />
                        </Button>
                      )}
                      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => del(n.id)} title={isAr ? "حذف" : "Delete"}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
