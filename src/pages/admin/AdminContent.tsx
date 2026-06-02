import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent, type FooterLink, type HeroFeature } from "@/lib/siteContent";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

const ICON_OPTIONS = ["Truck", "ShieldCheck", "Leaf", "Sparkles", "Package", "Heart", "Star", "Award", "Zap", "Gift"];

const AdminContent = () => {
  const { refresh } = useSiteContent();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    site_name: "",
    site_tagline: "",
    footer_description: "",
    footer_contact: "",
    footer_copyright: "",
    footer_links: [] as FooterLink[],
    hero_badge: "",
    hero_title: "",
    hero_title_highlight: "",
    hero_description: "",
    hero_cta_primary: "",
    hero_cta_secondary: "",
    hero_features: [] as HeroFeature[],
    featured_title: "",
    featured_subtitle: "",
  });

  useEffect(() => {
    document.title = "محتوى الموقع";
    supabase.from("site_content").select("*").eq("id", true).maybeSingle().then(({ data }) => {
      if (data) setForm({
        site_name: data.site_name,
        site_tagline: data.site_tagline,
        footer_description: data.footer_description,
        footer_contact: data.footer_contact,
        footer_copyright: data.footer_copyright,
        footer_links: (data.footer_links as unknown as FooterLink[]) || [],
        hero_badge: (data as any).hero_badge || "",
        hero_title: (data as any).hero_title || "",
        hero_title_highlight: (data as any).hero_title_highlight || "",
        hero_description: (data as any).hero_description || "",
        hero_cta_primary: (data as any).hero_cta_primary || "",
        hero_cta_secondary: (data as any).hero_cta_secondary || "",
        hero_features: ((data as any).hero_features as HeroFeature[]) || [],
        featured_title: (data as any).featured_title || "",
        featured_subtitle: (data as any).featured_subtitle || "",
      });
    });
  }, []);

  const updateLink = (i: number, key: keyof FooterLink, val: string) => {
    const links = [...form.footer_links];
    links[i] = { ...links[i], [key]: val };
    setForm({ ...form, footer_links: links });
  };

  const updateFeature = (i: number, key: keyof HeroFeature, val: string) => {
    const features = [...form.hero_features];
    features[i] = { ...features[i], [key]: val };
    setForm({ ...form, hero_features: features });
  };

  const save = async () => {
    setLoading(true);
    const { error } = await supabase.from("site_content").update({
      ...form,
      footer_links: form.footer_links as never,
      hero_features: form.hero_features as never,
      updated_at: new Date().toISOString(),
    }).eq("id", true);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ المحتوى");
    refresh();
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-extrabold mb-6">محتوى الموقع</h1>
      <div className="max-w-3xl space-y-8">
        <section className="space-y-4 p-6 bg-background rounded-xl border border-border shadow-card">
          <h2 className="font-bold text-lg">Header</h2>
          <div>
            <Label>اسم الموقع</Label>
            <Input value={form.site_name} onChange={(e) => setForm({ ...form, site_name: e.target.value })} />
          </div>
          <div>
            <Label>الشعار الفرعي (tagline)</Label>
            <Input value={form.site_tagline} onChange={(e) => setForm({ ...form, site_tagline: e.target.value })} />
          </div>
        </section>

        <section className="space-y-4 p-6 bg-background rounded-xl border border-border shadow-card">
          <h2 className="font-bold text-lg">قسم الـ Hero (أعلى الصفحة الرئيسية)</h2>
          <div>
            <Label>الشارة (Badge) فوق العنوان</Label>
            <Input value={form.hero_badge} onChange={(e) => setForm({ ...form, hero_badge: e.target.value })} />
          </div>
          <div>
            <Label>العنوان الكبير</Label>
            <Input value={form.hero_title} onChange={(e) => setForm({ ...form, hero_title: e.target.value })} />
          </div>
          <div>
            <Label>الكلمة المميزة في العنوان (هتظهر بلون مختلف)</Label>
            <Input value={form.hero_title_highlight} onChange={(e) => setForm({ ...form, hero_title_highlight: e.target.value })} placeholder="مثال: فاخرة" />
            <p className="text-xs text-muted-foreground mt-1">لازم تكون الكلمة موجودة في العنوان فوق</p>
          </div>
          <div>
            <Label>الوصف</Label>
            <Textarea rows={3} value={form.hero_description} onChange={(e) => setForm({ ...form, hero_description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>نص الزر الأساسي</Label>
              <Input value={form.hero_cta_primary} onChange={(e) => setForm({ ...form, hero_cta_primary: e.target.value })} />
            </div>
            <div>
              <Label>نص الزر الثاني</Label>
              <Input value={form.hero_cta_secondary} onChange={(e) => setForm({ ...form, hero_cta_secondary: e.target.value })} />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>المميزات (تحت الـ Hero)</Label>
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, hero_features: [...form.hero_features, { icon: "Sparkles", text: "" }] })}>
                <Plus className="h-4 w-4 ml-1" />إضافة
              </Button>
            </div>
            <div className="space-y-2">
              {form.hero_features.map((f, i) => (
                <div key={i} className="flex gap-2">
                  <select value={f.icon} onChange={(e) => updateFeature(i, "icon", e.target.value)} className="border rounded-md px-2 text-sm bg-background">
                    {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                  </select>
                  <Input placeholder="النص" value={f.text} onChange={(e) => updateFeature(i, "text", e.target.value)} />
                  <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, hero_features: form.hero_features.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4 p-6 bg-background rounded-xl border border-border shadow-card">
          <h2 className="font-bold text-lg">قسم الأكثر مبيعاً</h2>
          <div>
            <Label>عنوان القسم</Label>
            <Input value={form.featured_title} onChange={(e) => setForm({ ...form, featured_title: e.target.value })} />
          </div>
          <div>
            <Label>الوصف تحت العنوان</Label>
            <Input value={form.featured_subtitle} onChange={(e) => setForm({ ...form, featured_subtitle: e.target.value })} />
          </div>
        </section>

        <section className="space-y-4 p-6 bg-background rounded-xl border border-border shadow-card">
          <h2 className="font-bold text-lg">Footer</h2>
          <div>
            <Label>الوصف</Label>
            <Textarea rows={3} value={form.footer_description} onChange={(e) => setForm({ ...form, footer_description: e.target.value })} />
          </div>
          <div>
            <Label>نص التواصل</Label>
            <Textarea rows={2} value={form.footer_contact} onChange={(e) => setForm({ ...form, footer_contact: e.target.value })} />
          </div>
          <div>
            <Label>حقوق النشر</Label>
            <Input value={form.footer_copyright} onChange={(e) => setForm({ ...form, footer_copyright: e.target.value })} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>روابط سريعة</Label>
              <Button size="sm" variant="outline" onClick={() => setForm({ ...form, footer_links: [...form.footer_links, { label: "", url: "/" }] })}>
                <Plus className="h-4 w-4 ml-1" />إضافة
              </Button>
            </div>
            <div className="space-y-2">
              {form.footer_links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="الاسم" value={l.label} onChange={(e) => updateLink(i, "label", e.target.value)} />
                  <Input placeholder="/products" value={l.url} onChange={(e) => updateLink(i, "url", e.target.value)} />
                  <Button size="icon" variant="ghost" onClick={() => setForm({ ...form, footer_links: form.footer_links.filter((_, j) => j !== i) })}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Button onClick={save} disabled={loading} className="gradient-warm border-0">
          {loading ? "جارٍ الحفظ..." : "حفظ التغييرات"}
        </Button>
      </div>
    </AdminLayout>
  );
};
export default AdminContent;
