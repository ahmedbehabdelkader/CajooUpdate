
ALTER TABLE public.site_content
  ADD COLUMN IF NOT EXISTS hero_badge TEXT NOT NULL DEFAULT 'طبيعي 100% • توصيل سريع',
  ADD COLUMN IF NOT EXISTS hero_title TEXT NOT NULL DEFAULT 'مكسرات فاخرة محمصة بعناية',
  ADD COLUMN IF NOT EXISTS hero_title_highlight TEXT NOT NULL DEFAULT 'فاخرة',
  ADD COLUMN IF NOT EXISTS hero_description TEXT NOT NULL DEFAULT 'كاجو، فستق، لوز، بندق ومكسرات مشكلة — مختارة بعناية ومحمصة بأعلى جودة. اطلب الآن وادفع عند الاستلام.',
  ADD COLUMN IF NOT EXISTS hero_cta_primary TEXT NOT NULL DEFAULT 'تسوق الآن',
  ADD COLUMN IF NOT EXISTS hero_cta_secondary TEXT NOT NULL DEFAULT 'عرض المنتجات',
  ADD COLUMN IF NOT EXISTS hero_features JSONB NOT NULL DEFAULT '[
    {"icon":"Truck","text":"توصيل لجميع المدن"},
    {"icon":"ShieldCheck","text":"دفع عند الاستلام"},
    {"icon":"Leaf","text":"طبيعي 100%"}
  ]'::jsonb,
  ADD COLUMN IF NOT EXISTS featured_title TEXT NOT NULL DEFAULT 'الأكثر مبيعاً',
  ADD COLUMN IF NOT EXISTS featured_subtitle TEXT NOT NULL DEFAULT 'منتجاتنا المميزة المختارة لك';
