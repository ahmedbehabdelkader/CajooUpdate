import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent, type Banner } from "@/lib/siteContent";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const empty = (): Partial<Banner> => ({
  type: "hero", title: "", subtitle: "", description: "",
  button_text: "تسوق الآن", button_link: "/products",
  image_url: "", badge_text: "", position: 0, active: true,
});

const AdminBanners = () => {
  const { refresh } = useSiteContent();
  const [banners, setBanners] = useState<Banner[]>([]);
  const [creating, setCreating] = useState<Partial<Banner> | null>(null);

  const load = async () => {
    const { data } = await supabase.from("banners").select("*").order("type").order("position");
    setBanners((data || []) as Banner[]);
  };

  useEffect(() => { document.title = "البانرات"; load(); }, []);

  const save = async (b: Partial<Banner>) => {
    if (!b.title?.trim()) return toast.error("العنوان مطلوب");
    const payload = { ...b, updated_at: new Date().toISOString() };
    let error;
    if (b.id) {
      ({ error } = await supabase.from("banners").update(payload).eq("id", b.id));
    } else {
      ({ error } = await supabase.from("banners").insert(payload as never));
    }
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ");
    setCreating(null);
    load();
    refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("banners").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف");
    load();
    refresh();
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <h1 className="text-2xl font-extrabold">البانرات</h1>
        <Button onClick={() => setCreating(empty())} className="gradient-warm border-0">
          <Plus className="h-4 w-4 ml-1" />إضافة بانر
        </Button>
      </div>

      {creating && (
        <div className="mb-6 p-6 bg-background rounded-xl border-2 border-primary shadow-card">
          <h2 className="font-bold mb-4">بانر جديد</h2>
          <BannerForm value={creating} onChange={setCreating} />
          <div className="flex gap-2 mt-4">
            <Button onClick={() => save(creating)} className="gradient-warm border-0"><Save className="h-4 w-4 ml-1" />حفظ</Button>
            <Button variant="outline" onClick={() => setCreating(null)}>إلغاء</Button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {banners.map((b) => (
          <BannerCard key={b.id} banner={b} onSave={save} onDelete={remove} />
        ))}
        {banners.length === 0 && !creating && (
          <p className="text-muted-foreground text-center py-12">لا توجد بانرات بعد</p>
        )}
      </div>
    </AdminLayout>
  );
};

const BannerCard = ({ banner, onSave, onDelete }: { banner: Banner; onSave: (b: Partial<Banner>) => void; onDelete: (id: string) => void }) => {
  const [form, setForm] = useState<Partial<Banner>>(banner);
  return (
    <div className="p-6 bg-background rounded-xl border border-border shadow-card">
      <BannerForm value={form} onChange={setForm} />
      <div className="flex gap-2 mt-4 justify-between flex-wrap">
        <Button onClick={() => onSave(form)} className="gradient-warm border-0"><Save className="h-4 w-4 ml-1" />حفظ</Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" className="text-destructive"><Trash2 className="h-4 w-4 ml-1" />حذف</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>حذف البانر؟</AlertDialogTitle>
              <AlertDialogDescription>لا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>إلغاء</AlertDialogCancel>
              <AlertDialogAction onClick={() => onDelete(banner.id)}>حذف</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

const BannerForm = ({ value, onChange }: { value: Partial<Banner>; onChange: (v: Partial<Banner>) => void }) => {
  const u = (k: keyof Banner, v: string | number | boolean) => onChange({ ...value, [k]: v });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div>
        <Label>النوع</Label>
        <Select value={value.type} onValueChange={(v) => u("type", v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="hero">Hero (الرئيسي)</SelectItem>
            <SelectItem value="cta">CTA (دعوة للتسوق)</SelectItem>
            <SelectItem value="promo">Promo (ترويجي)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label>الترتيب</Label>
        <Input type="number" value={value.position ?? 0} onChange={(e) => u("position", Number(e.target.value))} />
      </div>
      <div className="md:col-span-2">
        <Label>العنوان *</Label>
        <Textarea rows={2} value={value.title || ""} onChange={(e) => u("title", e.target.value)} />
      </div>
      <div>
        <Label>العنوان الفرعي</Label>
        <Input value={value.subtitle || ""} onChange={(e) => u("subtitle", e.target.value)} />
      </div>
      <div>
        <Label>نص الشارة (Badge)</Label>
        <Input value={value.badge_text || ""} onChange={(e) => u("badge_text", e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Label>الوصف</Label>
        <Textarea rows={2} value={value.description || ""} onChange={(e) => u("description", e.target.value)} />
      </div>
      <div>
        <Label>نص الزر</Label>
        <Input value={value.button_text || ""} onChange={(e) => u("button_text", e.target.value)} />
      </div>
      <div>
        <Label>رابط الزر</Label>
        <Input value={value.button_link || ""} onChange={(e) => u("button_link", e.target.value)} />
      </div>
      <div className="md:col-span-2">
        <Label>رابط الصورة</Label>
        <Input placeholder="https://..." value={value.image_url || ""} onChange={(e) => u("image_url", e.target.value)} />
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={value.active ?? true} onCheckedChange={(v) => u("active", v)} />
        <Label>مفعّل</Label>
      </div>
    </div>
  );
};

export default AdminBanners;
