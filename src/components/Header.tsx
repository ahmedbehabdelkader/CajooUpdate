import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingCart, User, LogOut, LayoutDashboard, Package, Sparkles, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useSiteContent } from "@/lib/siteContent";
import { supabase } from "@/integrations/supabase/client";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { NotificationsBell } from "@/components/NotificationsBell";

export const Header = () => {
  const { count } = useCart();
  const { user, isAdmin } = useAuth();
  const { content } = useSiteContent();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const signOut = async () => { await supabase.auth.signOut(); navigate("/"); };
  const closeMenu = () => setMobileOpen(false);

  const navLinks = (
    <>
      <Link to="/" onClick={closeMenu} className="hover:text-primary transition-smooth">الرئيسية</Link>
      <Link to="/products" onClick={closeMenu} className="hover:text-primary transition-smooth">المنتجات</Link>
      {user && <Link to="/orders" onClick={closeMenu} className="hover:text-primary transition-smooth">طلباتي</Link>}
      {isAdmin && <Link to="/admin" onClick={closeMenu} className="hover:text-primary transition-smooth font-semibold text-accent">لوحة التحكم</Link>}
    </>
  );

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="القائمة">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetHeader>
                <SheetTitle className="text-gradient text-right">{content.site_name}</SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-4 mt-6 text-base font-medium">
                {navLinks}
              </nav>
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2 group min-w-0">
            <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl gradient-warm shadow-warm group-hover:scale-105 transition-bounce flex-shrink-0">
              <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-base sm:text-lg font-extrabold text-gradient truncate">{content.site_name}</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block truncate">{content.site_tagline}</span>
            </div>
          </Link>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          {navLinks}
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          <Button asChild variant="ghost" size="icon" className="relative">
            <Link to="/cart" aria-label="السلة">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <Badge className="absolute -top-1 -left-1 h-5 min-w-5 px-1 gradient-warm border-0 text-primary-foreground animate-scale-in">
                  {count}
                </Badge>
              )}
            </Link>
          </Button>

          {user && <NotificationsBell />}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon"><User className="h-5 w-5" /></Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate("/orders")}>
                  <Package className="ml-2 h-4 w-4" />طلباتي
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate("/admin")}>
                    <LayoutDashboard className="ml-2 h-4 w-4" />لوحة التحكم
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut}>
                  <LogOut className="ml-2 h-4 w-4" />تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild variant="default" size="sm" className="gradient-warm border-0 shadow-warm hover:opacity-90">
              <Link to="/auth">دخول</Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};
