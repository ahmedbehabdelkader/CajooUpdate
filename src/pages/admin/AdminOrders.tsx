import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STATUSES = [
  { v: "pending_verification", label: "بانتظار التحقق" },
  { v: "pending", label: "قيد الانتظار" },
  { v: "confirmed", label: "مؤكد" },
  { v: "shipped", label: "تم الشحن" },
  { v: "delivered", label: "تم التوصيل" },
  { v: "cancelled", label: "ملغي" },
];

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);

  const load = () => supabase.from("orders").select("*, order_items(*)").order("created_at", { ascending: false })
    .then(({ data }) => setOrders(data || []));

  useEffect(() => { document.title = "إدارة الطلبات"; load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("orders").update({ status: status as any }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم تحديث الحالة"); load();
  };

  const deleteOrder = async (id: string) => {
    const { error: e1 } = await supabase.from("order_items").delete().eq("order_id", id);
    if (e1) return toast.error(e1.message);
    const { error: e2 } = await supabase.from("orders").delete().eq("id", id);
    if (e2) return toast.error(e2.message);
    toast.success("تم حذف الطلب"); load();
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-extrabold mb-6">إدارة الطلبات</h1>
      <div className="space-y-4">
        {orders.length === 0 && <p className="text-muted-foreground text-center py-12">لا توجد طلبات بعد</p>}
        {orders.map((o) => (
          <div key={o.id} className="p-3 sm:p-5 bg-background rounded-xl border border-border shadow-card">
            <div className="flex flex-col sm:flex-row sm:flex-wrap justify-between gap-3 mb-3 pb-3 border-b border-border">
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-muted-foreground">#{o.id.slice(0, 8).toUpperCase()}</p>
                <p className="font-bold mt-1">{o.customer_name}</p>
                {o.customer_email && <p className="text-sm text-muted-foreground break-all" dir="ltr">✉️ {o.customer_email}</p>}
                <p className="text-sm text-muted-foreground">📞 {o.phone}</p>
                <p className="text-sm text-muted-foreground break-words">📍 {o.address}</p>
                {o.notes && <p className="text-sm text-muted-foreground break-words">📝 {o.notes}</p>}
                <div className={`mt-2 p-2 rounded-lg text-sm ${o.verified_at ? "bg-success/10 border border-success/30" : "bg-amber-500/10 border border-amber-500/30"}`}>
                  <p className="font-semibold">
                    {o.verified_at ? "✅ تم التحقق" : "⏳ لم يتم التحقق بعد"}
                    {o.verification_method && <span className="text-xs text-muted-foreground mr-2">({o.verification_method})</span>}
                  </p>
                  {o.verified_at && (
                    <p className="text-xs text-muted-foreground mt-1">
                      وقت التحقق: {new Date(o.verified_at).toLocaleString('ar-EG')}
                    </p>
                  )}
                  {!o.verified_at && o.status === "pending_verification" && (
                    <Button type="button" size="sm" variant="outline" className="mt-2 h-7"
                      onClick={() => updateStatus(o.id, "pending")}>
                      تأكيد يدوي
                    </Button>
                  )}
                </div>
                {(() => {
                  const pmLabels: Record<string, string> = {
                    cod: "الدفع عند الاستلام",
                    vodafone: "فودافون كاش",
                    etisalat: "اتصالات كاش",
                    orange: "أورانج كاش",
                    instapay: "إنستا باي",
                  };
                  const isDigital = o.payment_method && o.payment_method !== "cod";
                  return (
                    <div className={`mt-2 p-2 rounded-lg text-sm ${isDigital ? "bg-primary/10 border border-primary/30" : "bg-muted"}`}>
                      <p className="font-semibold">💳 طريقة الدفع: {pmLabels[o.payment_method as string] || o.payment_method}</p>
                      {isDigital && (
                        <p className="mt-1 text-xs break-all">
                          رقم العملية / المرسل: {o.payment_reference
                            ? <span className="font-mono font-bold text-primary" dir="ltr">{o.payment_reference}</span>
                            : <span className="text-destructive">غير متوفر</span>}
                        </p>
                      )}
                    </div>
                  );
                })()}
              </div>
              <div className="sm:text-left space-y-2 w-full sm:w-auto">
                <p className="text-2xl font-extrabold text-primary">{Number(o.total_price).toFixed(2)} ج.م</p>
                <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString('ar-EG')}</p>
                {o.coupon_code && <Badge variant="outline">كود: {o.coupon_code}</Badge>}
                <Select value={o.status} onValueChange={(v) => updateStatus(o.id, v)}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full sm:w-40">
                      <Trash2 className="h-4 w-4 ml-1" /> حذف الطلب
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>تأكيد حذف الطلب</AlertDialogTitle>
                      <AlertDialogDescription>
                        سيتم حذف الطلب وجميع عناصره نهائياً. لا يمكن التراجع.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>إلغاء</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteOrder(o.id)}>حذف</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
            <div className="space-y-1 text-sm">
              {o.order_items?.map((it: any) => (
                <div key={it.id} className="flex justify-between">
                  <span>{it.product_name} × {it.quantity}</span>
                  <span>{(it.price * it.quantity).toFixed(2)} ج.م</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};
export default AdminOrders;
