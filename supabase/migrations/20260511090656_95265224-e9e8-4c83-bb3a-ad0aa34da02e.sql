
-- Storage bucket for product/banner images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "public read product-images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "admins upload product-images" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update product-images" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete product-images" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND has_role(auth.uid(), 'admin'));

-- Seed products (Cajou nuts theme)
INSERT INTO public.products (name, description, price, old_price, category, featured, quantity, image_url) VALUES
('كاجو محمص ممتاز', 'كاجو فاخر محمص ومملح بعناية، 500 جرام', 280, 320, 'كاجو', true, 50, null),
('كاجو نيء', 'كاجو نيء طبيعي 100%، 500 جرام', 250, null, 'كاجو', true, 40, null),
('لوز محمص', 'لوز كاليفورنيا محمص، 500 جرام', 220, 260, 'لوز', true, 35, null),
('بندق تركي', 'بندق تركي مقشّر ومحمص، 500 جرام', 300, null, 'بندق', false, 25, null),
('فستق حلبي', 'فستق حلبي أصلي مملح، 500 جرام', 450, 500, 'فستق', true, 20, null),
('مكسرات مشكلة فاخرة', 'تشكيلة من أجود المكسرات، 1 كيلو', 380, null, 'مشكل', true, 30, null),
('عين جمل', 'عين جمل أمريكي مقشّر، 500 جرام', 260, null, 'مكسرات', false, 28, null),
('زبيب ذهبي', 'زبيب ذهبي إيراني، 500 جرام', 90, 110, 'مجففات', false, 60, null)
ON CONFLICT DO NOTHING;

-- Seed banner
INSERT INTO public.banners (title, subtitle, description, button_text, button_link, badge_text, type, position, active) VALUES
('كاجو — أجود أنواع المكسرات', 'محمصة بعناية، توصل لباب بيتك', 'اكتشف تشكيلتنا الفاخرة من الكاجو واللوز والفستق والبندق', 'تسوق الآن', '/products', 'جديد', 'hero', 0, true)
ON CONFLICT DO NOTHING;

-- Seed coupon
INSERT INTO public.coupons (code, discount_percent, active, first_order_only, min_subtotal, min_items) VALUES
('WELCOME10', 10, true, true, 0, 0),
('CAJOU20', 20, true, false, 500, 0)
ON CONFLICT DO NOTHING;

-- Ensure site_content & site_settings have a row
INSERT INTO public.site_content (id) VALUES (true) ON CONFLICT DO NOTHING;
INSERT INTO public.site_settings (id) VALUES (true) ON CONFLICT DO NOTHING;
