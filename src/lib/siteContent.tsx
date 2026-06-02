import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type FooterLink = { label: string; url: string };
export type HeroFeature = { icon: string; text: string };
export type SiteContent = {
  site_name: string;
  site_tagline: string;
  footer_description: string;
  footer_contact: string;
  footer_copyright: string;
  footer_links: FooterLink[];
  hero_badge: string;
  hero_title: string;
  hero_title_highlight: string;
  hero_description: string;
  hero_cta_primary: string;
  hero_cta_secondary: string;
  hero_features: HeroFeature[];
  featured_title: string;
  featured_subtitle: string;
};
export type Banner = {
  id: string;
  type: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  button_text: string | null;
  button_link: string | null;
  image_url: string | null;
  badge_text: string | null;
  position: number;
  active: boolean;
};

const DEFAULTS: SiteContent = {
  site_name: "كاجو",
  site_tagline: "مكسرات وأجود الأنواع",
  footer_description: "كاجو — مكسرات مختارة بعناية ومحمصة بأعلى جودة، توصل لباب بيتك.",
  footer_contact: "الدفع عند الاستلام متوفر لجميع الطلبات",
  footer_copyright: "© 2026 كاجو. جميع الحقوق محفوظة.",
  footer_links: [
    { label: "المنتجات", url: "/products" },
    { label: "الطلبات", url: "/orders" },
    { label: "التوصيل", url: "/" },
  ],
  hero_badge: "طبيعي 100% • توصيل سريع",
  hero_title: "مكسرات فاخرة محمصة بعناية",
  hero_title_highlight: "فاخرة",
  hero_description: "كاجو، فستق، لوز، بندق ومكسرات مشكلة — مختارة بعناية ومحمصة بأعلى جودة. اطلب الآن وادفع عند الاستلام.",
  hero_cta_primary: "تسوق الآن",
  hero_cta_secondary: "عرض المنتجات",
  hero_features: [
    { icon: "Truck", text: "توصيل لجميع المدن" },
    { icon: "ShieldCheck", text: "دفع عند الاستلام" },
    { icon: "Leaf", text: "طبيعي 100%" },
  ],
  featured_title: "الأكثر مبيعاً",
  featured_subtitle: "منتجاتنا المميزة المختارة لك",
};

type Ctx = { content: SiteContent; banners: Banner[]; loading: boolean; refresh: () => void };
const SiteContentContext = createContext<Ctx>({ content: DEFAULTS, banners: [], loading: true, refresh: () => {} });

export const SiteContentProvider = ({ children }: { children: ReactNode }) => {
  const [content, setContent] = useState<SiteContent>(DEFAULTS);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [{ data: c }, { data: b }] = await Promise.all([
      supabase.from("site_content").select("*").eq("id", true).maybeSingle(),
      supabase.from("banners").select("*").eq("active", true).order("position", { ascending: true }),
    ]);
    if (c) setContent({
      site_name: c.site_name,
      site_tagline: c.site_tagline,
      footer_description: c.footer_description,
      footer_contact: c.footer_contact,
      footer_copyright: c.footer_copyright,
      footer_links: (c.footer_links as unknown as FooterLink[]) || [],
      hero_badge: (c as any).hero_badge ?? DEFAULTS.hero_badge,
      hero_title: (c as any).hero_title ?? DEFAULTS.hero_title,
      hero_title_highlight: (c as any).hero_title_highlight ?? DEFAULTS.hero_title_highlight,
      hero_description: (c as any).hero_description ?? DEFAULTS.hero_description,
      hero_cta_primary: (c as any).hero_cta_primary ?? DEFAULTS.hero_cta_primary,
      hero_cta_secondary: (c as any).hero_cta_secondary ?? DEFAULTS.hero_cta_secondary,
      hero_features: ((c as any).hero_features as HeroFeature[]) ?? DEFAULTS.hero_features,
      featured_title: (c as any).featured_title ?? DEFAULTS.featured_title,
      featured_subtitle: (c as any).featured_subtitle ?? DEFAULTS.featured_subtitle,
    });
    setBanners((b || []) as Banner[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);
  return <SiteContentContext.Provider value={{ content, banners, loading, refresh: load }}>{children}</SiteContentContext.Provider>;
};

export const useSiteContent = () => useContext(SiteContentContext);
