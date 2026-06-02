import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Layout } from "@/components/Layout";
import { ProductCard, type Product } from "@/components/ProductCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const Products = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    document.title = "المنتجات | طازج";
    supabase.from("products").select("*").order("created_at", { ascending: false })
      .then(({ data }) => setProducts((data || []) as Product[]));
  }, []);

  const categories = useMemo(() => ["all", ...Array.from(new Set(products.map((p) => p.category)))], [products]);
  const filtered = products.filter((p) =>
    (category === "all" || p.category === category) &&
    (search === "" || p.name.includes(search) || p.description?.includes(search))
  );

  return (
    <Layout>
      <section className="gradient-sunset border-b border-border/50">
        <div className="container py-10 space-y-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-2">جميع المنتجات</h1>
            <p className="text-muted-foreground">اختر من تشكيلتنا الواسعة من المنتجات الطازجة</p>
          </div>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث عن منتج..." className="pr-10 h-11 bg-background" />
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Button key={c} size="sm" variant={category === c ? "default" : "outline"}
                  onClick={() => setCategory(c)}
                  className={category === c ? "gradient-warm border-0" : ""}>
                  {c === "all" ? "الكل" : c}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </section>
      <section className="container py-10">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-20">لا توجد منتجات مطابقة</p>
        ) : (
          <div className="grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {filtered.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        )}
      </section>
    </Layout>
  );
};

export default Products;
