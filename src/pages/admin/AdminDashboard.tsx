import { useEffect, useState } from "react";
import { Package, ShoppingBag, TrendingUp, DollarSign } from "lucide-react";
import { AdminLayout } from "@/components/AdminLayout";
import { supabase } from "@/integrations/supabase/client";

const StatCard = ({ icon: Icon, label, value, color }: any) => (
  <div className="p-6 gradient-card rounded-2xl border border-border/60 shadow-card">
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm text-muted-foreground">{label}</span>
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="h-5 w-5 text-primary-foreground" />
      </div>
    </div>
    <p className="text-3xl font-extrabold">{value}</p>
  </div>
);

const AdminDashboard = () => {
  const [stats, setStats] = useState({ orders: 0, revenue: 0, products: 0, pending: 0 });
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    document.title = "لوحة التحكم | طازج";
    (async () => {
      const [{ data: orders }, { count: pCount }, { data: items }, { data: recent }] = await Promise.all([
        supabase.from("orders").select("total_price, status"),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("order_items").select("product_name, quantity"),
        supabase.from("orders").select("*").order("created_at", { ascending: false }).limit(5),
      ]);
      const revenue = (orders || []).reduce((s, o) => s + Number(o.total_price), 0);
      const pending = (orders || []).filter((o) => o.status === "pending").length;
      setStats({ orders: orders?.length || 0, revenue, products: pCount || 0, pending });

      const counts: Record<string, number> = {};
      (items || []).forEach((i: any) => { counts[i.product_name] = (counts[i.product_name] || 0) + i.quantity; });
      setTopProducts(Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 5));
      setRecentOrders(recent || []);
    })();
  }, []);

  return (
    <AdminLayout>
      <h1 className="text-2xl font-extrabold mb-6">نظرة عامة</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard icon={ShoppingBag} label="إجمالي الطلبات" value={stats.orders} color="bg-primary" />
        <StatCard icon={DollarSign} label="إجمالي المبيعات" value={`${stats.revenue.toFixed(0)} ج.م`} color="gradient-warm" />
        <StatCard icon={Package} label="عدد المنتجات" value={stats.products} color="bg-accent" />
        <StatCard icon={TrendingUp} label="طلبات قيد الانتظار" value={stats.pending} color="bg-warning" />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="p-6 gradient-card rounded-2xl border border-border/60 shadow-card">
          <h3 className="font-bold text-lg mb-4">الأكثر مبيعاً</h3>
          {topProducts.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد بيانات</p> :
            <ul className="space-y-3">
              {topProducts.map(([name, qty], i) => (
                <li key={name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-full gradient-warm text-primary-foreground flex items-center justify-center font-bold text-xs">{i + 1}</span>
                    {name}
                  </span>
                  <span className="font-bold">{qty} وحدة</span>
                </li>
              ))}
            </ul>
          }
        </div>
        <div className="p-6 gradient-card rounded-2xl border border-border/60 shadow-card">
          <h3 className="font-bold text-lg mb-4">أحدث الطلبات</h3>
          {recentOrders.length === 0 ? <p className="text-sm text-muted-foreground">لا توجد طلبات</p> :
            <ul className="space-y-3">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex justify-between text-sm">
                  <span>{o.customer_name}</span>
                  <span className="font-bold text-primary">{Number(o.total_price).toFixed(0)} ج.م</span>
                </li>
              ))}
            </ul>
          }
        </div>
      </div>
    </AdminLayout>
  );
};
export default AdminDashboard;
