import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Truck, ShieldCheck, Leaf, Sparkles, Package, Heart, Star, Award, Zap, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";
import { ProductCard, type Product } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { useSiteContent } from "@/lib/siteContent";
import hero from "@/assets/hero-products.jpg";

const ICONS: Record<string, any> = { Truck, ShieldCheck, Leaf, Sparkles, Package, Heart, Star, Award, Zap, Gift };

const Index = () => {
  const [featured, setFeatured] = useState<Product[]>([]);
  const { banners, content } = useSiteContent();
  const heroBanner = banners.find((b) => b.type === "hero");
  const ctaBanner = banners.find((b) => b.type === "cta");

  useEffect(() => {
    document.title = `${content.site_name} | ${content.site_tagline}`;
    supabase.from("products").select("*").eq("featured", true).limit(4)
      .then(({ data }) => setFeatured((data || []) as Product[]));
  }, [content.site_name, content.site_tagline]);

  // Split title around highlight word
  const renderTitle = () => {
    const { hero_title, hero_title_highlight } = content;
    if (!hero_title_highlight || !hero_title.includes(hero_title_highlight)) {
      return <>{hero_title}</>;
    }
    const parts = hero_title.split(hero_title_highlight);
    return (
      <>
        {parts[0]}
        <span className="text-gradient">{hero_title_highlight}</span>
        {parts.slice(1).join(hero_title_highlight)}
      </>
    );
  };

  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden gradient-sunset">
        <div className="container grid gap-8 py-10 md:py-24 md:grid-cols-2 items-center">
          <div className="space-y-5 md:space-y-6 animate-fade-up order-2 md:order-1">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 sm:px-4 sm:py-1.5 text-xs sm:text-sm font-semibold text-primary">
              <Sparkles className="h-4 w-4" />{content.hero_badge}
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-6xl font-extrabold leading-tight tracking-tight">
              {renderTitle()}
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-lg">
              {content.hero_description}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gradient-warm border-0 shadow-warm hover:opacity-90 text-sm sm:text-base px-6 sm:px-8 flex-1 sm:flex-none min-w-[140px]">
                <Link to="/products">{content.hero_cta_primary}<ArrowLeft className="mr-2 h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="text-sm sm:text-base flex-1 sm:flex-none min-w-[140px]">
                <Link to="/products">{content.hero_cta_secondary}</Link>
              </Button>
            </div>
            <div className="flex flex-wrap gap-3 sm:gap-6 pt-2 sm:pt-4 text-xs sm:text-sm">
              {content.hero_features.map((f, i) => {
                const Icon = ICONS[f.icon] || Sparkles;
                return (
                  <div key={i} className="flex items-center gap-2">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />{f.text}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="relative order-1 md:order-2">
            <div className="absolute -inset-4 gradient-warm opacity-20 blur-3xl rounded-full" />
            <img src={heroBanner?.image_url || hero} alt={content.hero_title} width={1536} height={1024}
              className="relative rounded-2xl sm:rounded-3xl shadow-warm w-full object-cover animate-float" />
          </div>
        </div>
      </section>

      {/* Featured */}
      <section className="container py-10 md:py-16">
        <div className="flex items-end justify-between mb-6 md:mb-8 gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-1 sm:mb-2">{content.featured_title}</h2>
            <p className="text-sm sm:text-base text-muted-foreground">{content.featured_subtitle}</p>
          </div>
          <Button asChild variant="ghost" className="hidden sm:flex">
            <Link to="/products">عرض الكل<ArrowLeft className="mr-2 h-4 w-4" /></Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {featured.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>

      {/* CTA */}
      {ctaBanner && (
      <section className="container pb-10 md:pb-16">
        <div className="rounded-2xl sm:rounded-3xl gradient-warm p-6 sm:p-10 md:p-14 text-center text-primary-foreground shadow-warm relative overflow-hidden">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 30% 20%, white 1px, transparent 1px)", backgroundSize: "30px 30px" }} />
          <div className="relative space-y-3 sm:space-y-4">
            <h3 className="text-2xl sm:text-3xl md:text-4xl font-extrabold">{ctaBanner.title}</h3>
            {ctaBanner.description && (
              <p className="text-base sm:text-lg opacity-90">
                {ctaBanner.description}
                {ctaBanner.subtitle && <> <span className="font-mono font-bold bg-white/20 px-2 sm:px-3 py-1 rounded-lg mr-1">{ctaBanner.subtitle}</span></>}
              </p>
            )}
            {ctaBanner.button_text && (
              <Button asChild size="lg" variant="secondary" className="text-sm sm:text-base">
                <Link to={ctaBanner.button_link || "/products"}>{ctaBanner.button_text}</Link>
              </Button>
            )}
          </div>
        </div>
      </section>
      )}
    </Layout>
  );
};

export default Index;
