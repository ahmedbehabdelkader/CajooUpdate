import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package, Sparkles, Clock, CheckCircle2, ChefHat, Truck, XCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const STATUS_LABELS: Record<string, { label: string; variant: any }> = {
  pending_verification: { label: "بانتظار تأكيد البريد", variant: "secondary" },
  pending: { label: "قيد الانتظار", variant: "secondary" },
  confirmed: { label: "جارٍ التجهيز", variant: "default" },
  shipped: { label: "في الطريق", variant: "default" },
  delivered: { label: "تم التوصيل", variant: "default" },
  cancelled: { label: "ملغي", variant: "destructive" },
};

const TIMELINE = [
  { key: "pending", label: "تم الاستلام", Icon: Clock },
  { key: "confirmed", label: "جارٍ التجهيز", Icon: ChefHat },
  { key: "shipped", label: "في الطريق", Icon: Truck },
  { key: "delivered", label: "تم التوصيل", Icon: CheckCircle2 },
];

const StatusTimeline = ({ status }: { status: string }) => {
  if (status === "cancelled") {
    return (
      <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
        <XCircle className="h-5 w-5" />
        <span className="font-semibold">تم إلغاء الطلب</span>
      </div>
    );
  }
  const currentIdx = TIMELINE.findIndex((s) => s.key === status);
  const idx = currentIdx === -1 ? 0 : currentIdx;
  return (
    <div className="flex items-center justify-between gap-1 my-3">
      {TIMELINE.map((s, i) => {
        const reached = i <= idx;
        const active = i === idx;
        const Icon = s.Icon;
        return (
          <div key={s.key} className="flex-1 flex flex-col items-center text-center">
            <div className="flex items-center w-full">
              <div className={`flex-1 h-0.5 ${i === 0 ? "invisible" : reached ? "bg-primary" : "bg-border"}`} />
              <div className={`relative h-9 w-9 rounded-full flex items-center justify-center transition ${reached ? "gradient-warm text-primary-foreground shadow-warm" : "bg-secondary text-muted-foreground"} ${active ? "ring-4 ring-primary/20 animate-pulse" : ""}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className={`flex-1 h-0.5 ${i === TIMELINE.length - 1 ? "invisible" : reached && i < idx ? "bg-primary" : "bg-border"}`} />
            </div>
            <span className={`text-[10px] mt-1.5 ${reached ? "text-foreground font-semibold" : "text-muted-foreground"}`}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
};

const Orders = () => {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [loyalty, setLoyalty] = useState<{ balance: number; total_earned: number; total_spent: number } | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loyaltyCfg, setLoyaltyCfg] = useState({ enabled: true, earnPts: 1, earnAmt: 100, redeemPts: 1, redeemVal: 1 });

  useEffect(() => {
    document.title = "طلباتي | طازج";
    supabase.from("site_settings").select("*").eq("id", true).maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        const d = data as any;
        setLoyaltyCfg({
          enabled: d.loyalty_enabled ?? true,
          earnPts: Number(d.loyalty_points_per_earn ?? 1),
          earnAmt: Number(d.loyalty_earn_per_amount ?? 100),
          redeemPts: Number(d.loyalty_redeem_points ?? 1),
          redeemVal: Number(d.loyalty_redeem_value ?? 1),
        });
      });
    if (!user) return;
    supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })
      .then(({ data }) => setOrders(data || []));
    supabase.from("loyalty_points").select("balance,total_earned,total_spent").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setLoyalty(data ?? { balance: 0, total_earned: 0, total_spent: 0 }));
    supabase.from("loyalty_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10)
      .then(({ data }) => setTransactions(data || []));
  }, [user]);

  if (authLoading) return <Layout><div className="container py-20 text-center">جارٍ التحميل...</div></Layout>;
  if (!user) return (
    <Layout><div className="container py-20 text-center space-y-4">
      <h1 className="text-2xl font-bold">يجب تسجيل الدخول</h1>
      <Button asChild className="gradient-warm border-0"><Link to="/auth">تسجيل دخول</Link></Button>
    </div></Layout>
  );

  return (
    <Layout>
      <div className="container py-10">
        <h1 className="text-3xl font-extrabold mb-6">طلباتي</h1>

        <div className="mb-8 p-5 sm:p-6 gradient-warm rounded-2xl text-primary-foreground shadow-warm">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm opacity-90">رصيد نقاط الولاء</p>
                <p className="text-3xl font-extrabold">{loyalty?.balance ?? 0} <span className="text-base font-normal">نقطة</span></p>
              </div>
            </div>
            <div className="text-sm opacity-90 space-y-1">
              <p>إجمالي مكتسب: <span className="font-bold">{loyalty?.total_earned ?? 0}</span></p>
              <p>إجمالي مستخدم: <span className="font-bold">{loyalty?.total_spent ?? 0}</span></p>
            </div>
          </div>
          {loyaltyCfg.enabled && (
            <p className="text-xs opacity-80 mt-3">
              احصل على {loyaltyCfg.earnPts} نقطة لكل {loyaltyCfg.earnAmt} ج.م — كل {loyaltyCfg.redeemPts} نقطة = {loyaltyCfg.redeemVal} ج.م خصم
            </p>
          )}
        </div>

        {transactions.length > 0 && (
          <details className="mb-8 p-4 gradient-card rounded-2xl border border-border/60">
            <summary className="cursor-pointer font-bold">سجل النقاط ({transactions.length})</summary>
            <div className="mt-3 space-y-2 text-sm">
              {transactions.map((t) => (
                <div key={t.id} className="flex justify-between border-b border-border/40 pb-2 last:border-0">
                  <div>
                    <p>{t.description}</p>
                    <p className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString('ar-EG')}</p>
                  </div>
                  <span className={`font-bold ${t.points >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {t.points >= 0 ? '+' : ''}{t.points}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}

        {orders.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Package className="mx-auto h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground">لا توجد طلبات بعد</p>
            <Button asChild className="gradient-warm border-0"><Link to="/products">ابدأ التسوق</Link></Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => {
              const status = STATUS_LABELS[o.status] || STATUS_LABELS.pending;
              return (
                <div key={o.id} className="p-5 gradient-card rounded-2xl border border-border/60 shadow-card">
                  <div className="flex flex-wrap justify-between gap-3 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">طلب رقم</p>
                      <p className="font-mono font-bold">{o.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                    <div className="text-left">
                      <Badge variant={status.variant} className={o.status === 'delivered' ? 'bg-success text-success-foreground' : ''}>{status.label}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(o.created_at).toLocaleDateString('ar-EG')}</p>
                    </div>
                  </div>
                  <StatusTimeline status={o.status} />
                  <div className="border-t border-border pt-3 space-y-1 text-sm">
                    {o.order_items?.map((it: any) => (
                      <div key={it.id} className="flex justify-between">
                        <span className="text-muted-foreground">{it.product_name} × {it.quantity}</span>
                        <span>{(it.price * it.quantity).toFixed(2)} ج.م</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t border-border font-bold">
                      <span>الإجمالي</span><span className="text-primary">{Number(o.total_price).toFixed(2)} ج.م</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
};
export default Orders;
