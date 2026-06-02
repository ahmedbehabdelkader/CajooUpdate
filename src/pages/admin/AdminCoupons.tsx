import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Tag } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Coupon = {
  id: string;
  code: string;
  discount_percent: number;
  active: boolean;
  expires_at: string | null;
  first_order_only: boolean;
  min_subtotal: number;
  min_items: number;
};

const empty: Partial<Coupon> = {
  code: "",
  discount_percent: 10,
  active: true,
  expires_at: null,
  first_order_only: false,
  min_subtotal: 0,
  min_items: 0,
};

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [editing, setEditing] = useState<Partial<Coupon> | null>(null);
  const [open, setOpen] = useState(false);

  const load = () =>
    supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setCoupons((data as Coupon[]) || []));

  useEffect(() => {
    document.title = "إدارة الكوبونات";
    load();
  }, []);

  const save = async () => {
    if (!editing) return;
    const code = (editing.code || "").trim().toUpperCase();
    if (!code) return toast.error("أدخل كود الخصم");
    const percent = Number(editing.discount_percent);
    if (!percent || percent < 1 || percent > 100) return toast.error("النسبة يجب أن تكون بين 1 و 100");

    const payload = {
      code,
      discount_percent: percent,
      active: !!editing.active,
      expires_at: editing.expires_at ? new Date(editing.expires_at).toISOString() : null,
      first_order_only: !!editing.first_order_only,
      min_subtotal: Number(editing.min_subtotal) || 0,
      min_items: Number(editing.min_items) || 0,
    };
    const { error } = editing.id
      ? await supabase.from("coupons").update(payload).eq("id", editing.id)
      : await supabase.from("coupons").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "تم التحديث" : "تمت الإضافة");
    setOpen(false);
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("حذف الكوبون؟")) return;
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
  };

  const toggleActive = async (c: Coupon) => {
    const { error } = await supabase.from("coupons").update({ active: !c.active }).eq("id", c.id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-extrabold">إدارة الكوبونات</h1>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditing(empty)} className="gradient-warm border-0">
              <Plus className="h-4 w-4 ml-1" />إضافة كوبون
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>{editing?.id ? "تعديل كوبون" : "إضافة كوبون"}</DialogTitle></DialogHeader>
            {editing && (
              <div className="space-y-3">
                <div>
                  <Label>كود الخصم</Label>
                  <Input
                    value={editing.code || ""}
                    onChange={(e) => setEditing({ ...editing, code: e.target.value.toUpperCase() })}
                    placeholder="WELCOME10"
                    className="uppercase"
                  />
                </div>
                <div>
                  <Label>نسبة الخصم (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={editing.discount_percent ?? 10}
                    onChange={(e) => setEditing({ ...editing, discount_percent: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>تاريخ الانتهاء (اختياري)</Label>
                  <Input
                    type="date"
                    value={editing.expires_at ? String(editing.expires_at).slice(0, 10) : ""}
                    onChange={(e) => setEditing({ ...editing, expires_at: e.target.value || null })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>حد أدنى للسعر (ج.م)</Label>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      value={editing.min_subtotal ?? 0}
                      onChange={(e) => setEditing({ ...editing, min_subtotal: Number(e.target.value) })}
                      placeholder="0 = بدون شرط"
                    />
                  </div>
                  <div>
                    <Label>حد أدنى للكمية</Label>
                    <Input
                      type="number"
                      min={0}
                      value={editing.min_items ?? 0}
                      onChange={(e) => setEditing({ ...editing, min_items: Number(e.target.value) })}
                      placeholder="0 = بدون شرط"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.first_order_only}
                    onChange={(e) => setEditing({ ...editing, first_order_only: e.target.checked })}
                  />
                  لأول طلب فقط (يتطلب تسجيل دخول)
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={!!editing.active}
                    onChange={(e) => setEditing({ ...editing, active: e.target.checked })}
                  />
                  مفعّل
                </label>
                <Button onClick={save} className="w-full gradient-warm border-0">حفظ</Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {coupons.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <Tag className="mx-auto h-12 w-12 mb-3 opacity-50" />
            لا توجد كوبونات بعد
          </div>
        ) : (
          coupons.map((c) => {
            const expired = c.expires_at && new Date(c.expires_at) < new Date();
            return (
              <div key={c.id} className="flex items-center gap-4 p-4 bg-background rounded-xl border border-border shadow-card">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg gradient-warm">
                  <Tag className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold font-mono">{c.code}</h3>
                    <Badge variant={c.active && !expired ? "default" : "secondary"} className={c.active && !expired ? "gradient-warm border-0" : ""}>
                      {expired ? "منتهي" : c.active ? "مفعّل" : "موقوف"}
                    </Badge>
                    {c.first_order_only && <Badge variant="outline">أول طلب فقط</Badge>}
                    {c.min_subtotal > 0 && <Badge variant="outline">حد أدنى {c.min_subtotal} ج.م</Badge>}
                    {c.min_items > 0 && <Badge variant="outline">≥ {c.min_items} منتج</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    خصم {c.discount_percent}%
                    {c.expires_at && ` • ينتهي ${new Date(c.expires_at).toLocaleDateString("ar-EG")}`}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => toggleActive(c)}>
                    {c.active ? "إيقاف" : "تفعيل"}
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(c); setOpen(true); }}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => del(c.id)} className="text-destructive">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminCoupons;
