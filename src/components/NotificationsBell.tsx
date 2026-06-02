import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/notificationSound";

type Notification = {
  id: string;
  title: string;
  message: string;
  read: boolean;
  order_id: string | null;
  type: string;
  created_at: string;
};

export const NotificationsBell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Notification[]>([]);

  const unread = items.filter((n) => !n.read).length;

  useEffect(() => {
    if (!user) {
      setItems([]);
      return;
    }
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => setItems((data as Notification[]) ?? []));

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const n = payload.new as Notification;
          setItems((prev) => [n, ...prev].slice(0, 20));
          playNotificationSound();
          toast.success(n.title, { description: n.message });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  if (!user) return null;

  const markAllRead = async () => {
    if (unread === 0) return;
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await supabase.from("notifications").update({ read: true }).in("id", ids);
  };

  const openItem = async (n: Notification) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      await supabase.from("notifications").update({ read: true }).eq("id", n.id);
    }
    if (n.type === "new_order") navigate("/admin/orders");
    else navigate("/orders");
  };

  return (
    <DropdownMenu onOpenChange={(o) => o && markAllRead()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="الإشعارات">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge className="absolute -top-1 -left-1 h-5 min-w-5 px-1 gradient-warm border-0 text-primary-foreground animate-scale-in">
              {unread}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <DropdownMenuLabel>الإشعارات</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 ? (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">لا توجد إشعارات</div>
        ) : (
          items.map((n) => (
            <DropdownMenuItem
              key={n.id}
              onClick={() => openItem(n)}
              className={`flex flex-col items-start gap-1 py-2 ${!n.read ? "bg-primary/5" : ""}`}
            >
              <div className="flex items-center gap-2 w-full">
                {!n.read && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                <span className="font-semibold text-sm">{n.title}</span>
              </div>
              <span className="text-xs text-muted-foreground">{n.message}</span>
              <span className="text-[10px] text-muted-foreground">
                {new Date(n.created_at).toLocaleString("ar-EG")}
              </span>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
