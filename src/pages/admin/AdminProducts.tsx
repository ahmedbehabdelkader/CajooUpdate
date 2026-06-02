import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, Upload, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/images";
import { toast } from "sonner";

type Product = { id: string; name: string; description: string | null; price: number; old_price: number | null; image_url: string | null; quantity: number; category: string; featured: boolean };

const empty = { name: "", description: "", price: 0, old_price: null as number | null, image_url: "", quantity: 0, category: "عام", featured: false };

const AdminProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Partial<Product> | null>(null);
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const load = () => supabase.from("products").select("*").order("created_at", { ascending: false })
    .then(({ data }) => setProducts((data as Product[]) || []));

  useEffect(() => { document.title = "إدارة المنتجات"; load(); }, []);

  const save = async () => {
    if (!editing) return;
    const payload = {
      name: editing.name || "",
      description: editing.description || null,
      price: Number(editing.price) || 0,
      old_price: editing.old_price ? Number(editing.old_price) : null,
      image_url: editing.image_url || null,
      quantity: Number(editing.quantity) || 0,
      category: editing.category || "عام",
      featured: !!editing.featured,
    };
    const { error } = editing.id
      ? await supabase.from("products").update(payload).eq("id", editing.id)
      : await supabase.from("products").insert(payload);
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "تم التحديث" : "تمت الإضافة");
    setOpen(false); setEditing(null); load();
  };

  const del = async (id: string) => {
    if (!confirm("حذف المنتج؟")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("تم الحذف"); load();
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { name: "تفاحة بلدي", description: "تفاح طازج", price: 50, old_price: 70, quantity: 100, category: "فواكه", image_url: "https://...", featured: false },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "products");
    XLSX.writeFile(wb, "products-template.xlsx");
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<any>(ws);
      if (!rows.length) { toast.error("الملف فارغ"); return; }
      const payload = rows.map((r) => ({
        name: String(r.name ?? r.الاسم ?? "").trim(),
        description: r.description ?? r.الوصف ?? null,
        price: Number(r.price ?? r.السعر ?? 0) || 0,
        old_price: r.old_price || r["السعر القديم"] ? Number(r.old_price ?? r["السعر القديم"]) : null,
        quantity: Number(r.quantity ?? r.الكمية ?? 0) || 0,
        category: String(r.category ?? r.التصنيف ?? "عام").trim() || "عام",
        image_url: r.image_url || r["رابط الصورة"] || null,
        featured: r.featured === true || r.featured === "true" || r.featured === 1,
      })).filter((p) => p.name && p.price > 0);
      if (!payload.length) { toast.error("لا توجد منتجات صالحة. تأكد من وجود عمود name و price"); return; }
      const { error } = await supabase.from("products").insert(payload);
      if (error) throw error;
      toast.success(`تم استيراد ${payload.length} منتج`);
      load();
    } catch (err: any) {
      toast.error(err.message || "فشل الاستيراد");
    } finally {
      setImporting(false);
    }
  };

  return (
    <AdminLayout>
      <div className="flex justify-between items-center mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-extrabold">إدارة المنتجات</h1>
        <div className="flex gap-2 flex-wrap">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={onFile} />
          <Button variant="outline" onClick={downloadTemplate} size="sm"><Download className="h-4 w-4 ml-1" />نموذج Excel</Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importing} size="sm">
            <Upload className="h-4 w-4 ml-1" />{importing ? "جارٍ الرفع..." : "رفع Excel"}
          </Button>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditing(empty)} className="gradient-warm border-0"><Plus className="h-4 w-4 ml-1" />إضافة منتج</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editing?.id ? "تعديل منتج" : "إضافة منتج"}</DialogTitle></DialogHeader>
              {editing && (
                <div className="space-y-3">
                  <div><Label>الاسم</Label><Input value={editing.name || ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></div>
                  <div><Label>الوصف</Label><Textarea value={editing.description || ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>السعر بعد الخصم</Label><Input type="number" step="0.01" value={editing.price || 0} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} /></div>
                    <div><Label>السعر القديم (اختياري)</Label><Input type="number" step="0.01" value={editing.old_price ?? ""} onChange={(e) => setEditing({ ...editing, old_price: e.target.value ? Number(e.target.value) : null })} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>الكمية</Label><Input type="number" value={editing.quantity || 0} onChange={(e) => setEditing({ ...editing, quantity: Number(e.target.value) })} /></div>
                    <div><Label>التصنيف</Label><Input value={editing.category || ""} onChange={(e) => setEditing({ ...editing, category: e.target.value })} /></div>
                  </div>
                  <div><Label>رابط الصورة</Label><Input value={editing.image_url || ""} onChange={(e) => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://..." /></div>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!editing.featured} onChange={(e) => setEditing({ ...editing, featured: e.target.checked })} />
                    منتج مميز
                  </label>
                  <Button onClick={save} className="w-full gradient-warm border-0">حفظ</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>
      <div className="grid gap-3">
        {products.map((p) => (
          <div key={p.id} className="flex items-center gap-4 p-4 bg-background rounded-xl border border-border shadow-card">
            <img src={resolveImage(p.image_url)} alt={p.name} className="h-16 w-16 rounded-lg object-cover" />
            <div className="flex-1 min-w-0">
              <h3 className="font-bold truncate">{p.name}</h3>
              <p className="text-xs text-muted-foreground">{p.category} • متوفر: {p.quantity}</p>
            </div>
            <div className="text-left">
              <p className="font-bold text-primary">{Number(p.price).toFixed(2)} ج.م</p>
              {p.old_price && Number(p.old_price) > Number(p.price) && (
                <p className="text-xs text-muted-foreground line-through">{Number(p.old_price).toFixed(2)} ج.م</p>
              )}
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setOpen(true); }}><Pencil className="h-4 w-4" /></Button>
              <Button size="icon" variant="ghost" onClick={() => del(p.id)} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </AdminLayout>
  );
};
export default AdminProducts;
