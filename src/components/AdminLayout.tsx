import { ReactNode, useState } from "react";
import { Link, useLocation, Navigate } from "react-router-dom";
import { LayoutDashboard, Package, ShoppingBag, Sparkles, ArrowLeft, Tag, Settings, FileText, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";

export const AdminLayout = ({ children }: { children: ReactNode }) => {
  const { user, isAdmin, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div className="min-h-screen flex items-center justify-center">جارٍ التحميل...</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">لا تملك صلاحية الوصول</h1>
      <p className="text-muted-foreground">هذه الصفحة مخصصة للمشرفين فقط.</p>
      <Button asChild><Link to="/">العودة للرئيسية</Link></Button>
    </div>
  );

  const links = [
    { to: "/admin", icon: LayoutDashboard, label: "نظرة عامة" },
    { to: "/admin/products", icon: Package, label: "المنتجات" },
    { to: "/admin/orders", icon: ShoppingBag, label: "الطلبات" },
    { to: "/admin/coupons", icon: Tag, label: "الكوبونات" },
    { to: "/admin/banners", icon: Image, label: "البانرات" },
    { to: "/admin/content", icon: FileText, label: "محتوى الموقع" },
    { to: "/admin/settings", icon: Settings, label: "الإعدادات" },
  ];

  return (
    <div className="min-h-screen flex bg-secondary/30">
      <aside className="hidden md:flex w-64 flex-col border-l border-border bg-background">
        <Link to="/" className="flex items-center gap-2 px-6 h-16 border-b border-border">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-warm">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-extrabold text-gradient">طازج Admin</span>
        </Link>
        <nav className="flex-1 p-3 space-y-1">
          {links.map((l) => {
            const active = location.pathname === l.to;
            return (
              <Link key={l.to} to={l.to}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth ${active ? "gradient-warm text-primary-foreground shadow-soft" : "hover:bg-secondary"}`}>
                <l.icon className="h-4 w-4" />{l.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <Button asChild variant="ghost" className="w-full justify-start"><Link to="/"><ArrowLeft className="ml-2 h-4 w-4" />عودة للمتجر</Link></Button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <div className="md:hidden flex gap-2 p-3 border-b border-border bg-background overflow-x-auto">
          {links.map((l) => (
            <Button key={l.to} asChild size="sm" variant={location.pathname === l.to ? "default" : "outline"}
              className={location.pathname === l.to ? "gradient-warm border-0" : ""}>
              <Link to={l.to}><l.icon className="h-4 w-4 ml-1" />{l.label}</Link>
            </Button>
          ))}
          <Button asChild size="sm" variant="outline"><Link to="/"><ArrowLeft className="ml-1 h-4 w-4" />المتجر</Link></Button>
        </div>
        <div className="p-3 sm:p-4 md:p-6">{children}</div>
      </main>
    </div>
  );
};
