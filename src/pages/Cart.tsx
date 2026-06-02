import { Link } from "react-router-dom";
import { Minus, Plus, Trash2, ShoppingBag, ArrowLeft } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { resolveImage } from "@/lib/images";

const Cart = () => {
  const { items, setQty, remove, subtotal, clear } = useCart();

  if (items.length === 0) {
    return (
      <Layout>
        <div className="container py-20 text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-secondary flex items-center justify-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold">سلتك فارغة</h1>
          <p className="text-muted-foreground">ابدأ بإضافة منتجات لإكمال طلبك</p>
          <Button asChild className="gradient-warm border-0"><Link to="/products">تصفح المنتجات</Link></Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 md:py-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-6 md:mb-8">سلة المشتريات</h1>
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item.id} className="flex gap-3 sm:gap-4 p-3 sm:p-4 gradient-card rounded-2xl border border-border/60 shadow-card">
                <img src={resolveImage(item.image_url)} alt={item.name} className="h-20 w-20 sm:h-24 sm:w-24 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 flex flex-col justify-between min-w-0">
                  <div className="flex justify-between gap-2">
                    <h3 className="font-bold text-sm sm:text-base line-clamp-2">{item.name}</h3>
                    <Button size="icon" variant="ghost" onClick={() => remove(item.id)} className="text-destructive h-8 w-8 flex-shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-1 border border-border rounded-lg">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQty(item.id, item.quantity - 1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQty(item.id, item.quantity + 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="font-bold text-primary text-sm sm:text-base whitespace-nowrap">{(item.price * item.quantity).toFixed(2)} ج.م</div>
                  </div>
                </div>
              </div>
            ))}
            <Button variant="ghost" onClick={clear} className="text-destructive">إفراغ السلة</Button>
          </div>
          <aside className="h-fit p-5 sm:p-6 gradient-card rounded-2xl border border-border/60 shadow-card lg:sticky lg:top-20 space-y-4">
            <h3 className="font-bold text-lg">ملخص الطلب</h3>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">الإجمالي الفرعي</span>
              <span className="font-bold">{subtotal.toFixed(2)} ج.م</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">التوصيل</span>
              <span className="text-success font-semibold">مجاني</span>
            </div>
            <div className="border-t border-border pt-3 flex justify-between text-lg">
              <span className="font-bold">الإجمالي</span>
              <span className="font-extrabold text-primary">{subtotal.toFixed(2)} ج.م</span>
            </div>
            <Button asChild className="w-full gradient-warm border-0 shadow-warm h-12 text-base">
              <Link to="/checkout">إتمام الشراء<ArrowLeft className="mr-2 h-4 w-4" /></Link>
            </Button>
          </aside>
        </div>
      </div>
    </Layout>
  );
};

export default Cart;
