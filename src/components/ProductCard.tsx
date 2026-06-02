import { ShoppingCart, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/lib/cart";
import { resolveImage } from "@/lib/images";
import { toast } from "sonner";

export type Product = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  old_price?: number | null;
  image_url: string | null;
  quantity: number;
  category: string;
  featured?: boolean;
};

export const ProductCard = ({ product }: { product: Product }) => {
  const { add } = useCart();
  const outOfStock = product.quantity === 0;

  const handleAdd = () => {
    if (outOfStock) return;
    add({ id: product.id, name: product.name, price: product.price, image_url: product.image_url, stock: product.quantity });
    toast.success(`تمت إضافة ${product.name} للسلة`);
  };

  return (
    <article className="group relative gradient-card rounded-2xl border border-border/60 overflow-hidden shadow-card hover:shadow-warm transition-smooth hover:-translate-y-1">
      <div className="relative aspect-square overflow-hidden bg-secondary">
        <img
          src={resolveImage(product.image_url)}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover group-hover:scale-110 transition-smooth duration-500"
        />
        {product.featured && (
          <Badge className="absolute top-3 right-3 gradient-warm border-0 text-primary-foreground shadow-warm">
            <Star className="h-3 w-3 ml-1 fill-current" />مميز
          </Badge>
        )}
        {product.old_price && product.old_price > product.price && (
          <Badge variant="destructive" className="absolute top-3 left-3">
            -{Math.round(((product.old_price - product.price) / product.old_price) * 100)}%
          </Badge>
        )}
        {outOfStock && (
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm flex items-center justify-center">
            <Badge variant="destructive" className="text-base px-4 py-1.5">نفدت الكمية</Badge>
          </div>
        )}
      </div>
      <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <div>
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">{product.category}</p>
          <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-1">{product.name}</h3>
          {product.description && (
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2 mt-1">{product.description}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
          <div className="flex items-baseline gap-1 sm:gap-2 flex-wrap">
            <span className="text-lg sm:text-2xl font-extrabold text-primary">{product.price}</span>
            <span className="text-[10px] sm:text-xs text-muted-foreground">ج.م</span>
            {product.old_price && product.old_price > product.price && (
              <span className="text-xs sm:text-sm text-muted-foreground line-through">{product.old_price}</span>
            )}
          </div>
          <Button onClick={handleAdd} disabled={outOfStock} size="sm" className="gradient-warm border-0 hover:opacity-90 shadow-soft w-full sm:w-auto px-2 sm:px-3">
            <ShoppingCart className="h-4 w-4 ml-1 flex-shrink-0" /><span>أضف</span>
          </Button>
        </div>
      </div>
    </article>
  );
};
