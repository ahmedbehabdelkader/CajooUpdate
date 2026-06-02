
-- Roles enum & table
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE POLICY "users view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "admins view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile + default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Products
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  category TEXT NOT NULL DEFAULT 'عام',
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone view products" ON public.products FOR SELECT USING (true);
CREATE POLICY "admins manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Coupons
CREATE TABLE public.coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
  active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone view active coupons" ON public.coupons FOR SELECT USING (active = true);
CREATE POLICY "admins manage coupons" ON public.coupons FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Orders
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  notes TEXT,
  subtotal NUMERIC(10,2) NOT NULL,
  discount NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(10,2) NOT NULL,
  coupon_code TEXT,
  status order_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users create orders" ON public.orders FOR INSERT WITH CHECK (true);
CREATE POLICY "users view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "admins view all orders" ON public.orders FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update orders" ON public.orders FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Order items
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "users insert order items" ON public.order_items FOR INSERT WITH CHECK (true);
CREATE POLICY "users view own order items" ON public.order_items FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND o.user_id = auth.uid())
);
CREATE POLICY "admins view all order items" ON public.order_items FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Reviews
CREATE TABLE public.reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, user_id)
);
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone view reviews" ON public.reviews FOR SELECT USING (true);
CREATE POLICY "users create own reviews" ON public.reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own reviews" ON public.reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "users delete own reviews" ON public.reviews FOR DELETE USING (auth.uid() = user_id);

-- Place order RPC: validates stock, decrements quantity, creates order + items atomically
CREATE OR REPLACE FUNCTION public.place_order(
  _customer_name TEXT,
  _phone TEXT,
  _address TEXT,
  _notes TEXT,
  _coupon_code TEXT,
  _items JSONB
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _order_id UUID;
  _item JSONB;
  _product RECORD;
  _subtotal NUMERIC := 0;
  _discount NUMERIC := 0;
  _total NUMERIC;
  _coupon RECORD;
BEGIN
  -- Validate & lock products, compute subtotal
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products
      WHERE id = (_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'منتج غير موجود'; END IF;
    IF _product.quantity < (_item->>'quantity')::int THEN
      RAISE EXCEPTION 'الكمية غير متوفرة لـ %', _product.name;
    END IF;
    _subtotal := _subtotal + (_product.price * (_item->>'quantity')::int);
  END LOOP;

  -- Apply coupon
  IF _coupon_code IS NOT NULL AND length(_coupon_code) > 0 THEN
    SELECT * INTO _coupon FROM public.coupons
      WHERE code = upper(_coupon_code) AND active = true
        AND (expires_at IS NULL OR expires_at > now());
    IF FOUND THEN
      _discount := round(_subtotal * _coupon.discount_percent / 100.0, 2);
    END IF;
  END IF;
  _total := _subtotal - _discount;

  -- Create order
  INSERT INTO public.orders (user_id, customer_name, phone, address, notes, subtotal, discount, total_price, coupon_code)
  VALUES (auth.uid(), _customer_name, _phone, _address, _notes, _subtotal, _discount, _total,
          CASE WHEN _coupon.code IS NOT NULL THEN _coupon.code ELSE NULL END)
  RETURNING id INTO _order_id;

  -- Insert items + decrement stock
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products WHERE id = (_item->>'product_id')::uuid;
    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, price)
    VALUES (_order_id, _product.id, _product.name, (_item->>'quantity')::int, _product.price);
    UPDATE public.products SET quantity = quantity - (_item->>'quantity')::int WHERE id = _product.id;
  END LOOP;

  RETURN _order_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.place_order(_customer_name text, _phone text, _address text, _notes text, _coupon_code text, _items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _order_id UUID;
  _item JSONB;
  _product RECORD;
  _subtotal NUMERIC := 0;
  _discount NUMERIC := 0;
  _total NUMERIC;
  _coupon RECORD;
  _applied_code TEXT := NULL;
BEGIN
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products
      WHERE id = (_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'منتج غير موجود'; END IF;
    IF _product.quantity < (_item->>'quantity')::int THEN
      RAISE EXCEPTION 'الكمية غير متوفرة لـ %', _product.name;
    END IF;
    _subtotal := _subtotal + (_product.price * (_item->>'quantity')::int);
  END LOOP;

  IF _coupon_code IS NOT NULL AND length(_coupon_code) > 0 THEN
    SELECT * INTO _coupon FROM public.coupons
      WHERE code = upper(_coupon_code) AND active = true
        AND (expires_at IS NULL OR expires_at > now());
    IF FOUND THEN
      _discount := round(_subtotal * _coupon.discount_percent / 100.0, 2);
      _applied_code := _coupon.code;
    END IF;
  END IF;
  _total := _subtotal - _discount;

  INSERT INTO public.orders (user_id, customer_name, phone, address, notes, subtotal, discount, total_price, coupon_code)
  VALUES (auth.uid(), _customer_name, _phone, _address, _notes, _subtotal, _discount, _total, _applied_code)
  RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products WHERE id = (_item->>'product_id')::uuid;
    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, price)
    VALUES (_order_id, _product.id, _product.name, (_item->>'quantity')::int, _product.price);
    UPDATE public.products SET quantity = quantity - (_item->>'quantity')::int WHERE id = _product.id;
  END LOOP;

  RETURN _order_id;
END;
$function$;
-- Add new conditional columns to coupons
ALTER TABLE public.coupons
  ADD COLUMN IF NOT EXISTS first_order_only boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_subtotal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_items integer NOT NULL DEFAULT 0;

-- Update place_order to validate the new conditions and surface clear errors
CREATE OR REPLACE FUNCTION public.place_order(
  _customer_name text,
  _phone text,
  _address text,
  _notes text,
  _coupon_code text,
  _items jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _order_id UUID;
  _item JSONB;
  _product RECORD;
  _subtotal NUMERIC := 0;
  _discount NUMERIC := 0;
  _total NUMERIC;
  _coupon RECORD;
  _applied_code TEXT := NULL;
  _total_items INT := 0;
  _user_orders_count INT := 0;
BEGIN
  -- Validate stock and compute subtotal + total items
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products
      WHERE id = (_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'منتج غير موجود'; END IF;
    IF _product.quantity < (_item->>'quantity')::int THEN
      RAISE EXCEPTION 'الكمية غير متوفرة لـ %', _product.name;
    END IF;
    _subtotal := _subtotal + (_product.price * (_item->>'quantity')::int);
    _total_items := _total_items + (_item->>'quantity')::int;
  END LOOP;

  -- Coupon validation
  IF _coupon_code IS NOT NULL AND length(_coupon_code) > 0 THEN
    SELECT * INTO _coupon FROM public.coupons
      WHERE code = upper(_coupon_code) AND active = true
        AND (expires_at IS NULL OR expires_at > now());
    IF NOT FOUND THEN
      RAISE EXCEPTION 'كود الخصم غير صحيح أو منتهي الصلاحية';
    END IF;

    -- First order only
    IF _coupon.first_order_only THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'هذا الكوبون لأول طلب فقط — يجب تسجيل الدخول';
      END IF;
      SELECT count(*) INTO _user_orders_count FROM public.orders WHERE user_id = auth.uid();
      IF _user_orders_count > 0 THEN
        RAISE EXCEPTION 'هذا الكوبون صالح لأول طلب فقط';
      END IF;
    END IF;

    -- Minimum subtotal
    IF _coupon.min_subtotal > 0 AND _subtotal < _coupon.min_subtotal THEN
      RAISE EXCEPTION 'هذا الكوبون يتطلب حد أدنى للسلة %', _coupon.min_subtotal;
    END IF;

    -- Minimum items
    IF _coupon.min_items > 0 AND _total_items < _coupon.min_items THEN
      RAISE EXCEPTION 'هذا الكوبون يتطلب % منتجات على الأقل', _coupon.min_items;
    END IF;

    _discount := round(_subtotal * _coupon.discount_percent / 100.0, 2);
    _applied_code := _coupon.code;
  END IF;

  _total := _subtotal - _discount;

  INSERT INTO public.orders (user_id, customer_name, phone, address, notes, subtotal, discount, total_price, coupon_code)
  VALUES (auth.uid(), _customer_name, _phone, _address, _notes, _subtotal, _discount, _total, _applied_code)
  RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products WHERE id = (_item->>'product_id')::uuid;
    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, price)
    VALUES (_order_id, _product.id, _product.name, (_item->>'quantity')::int, _product.price);
    UPDATE public.products SET quantity = quantity - (_item->>'quantity')::int WHERE id = _product.id;
  END LOOP;

  RETURN _order_id;
END;
$function$;

CREATE TABLE public.site_settings (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  shipping_cost NUMERIC NOT NULL DEFAULT 50,
  free_shipping_threshold NUMERIC NOT NULL DEFAULT 500,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone view settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "admins manage settings" ON public.site_settings FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.site_settings (id, shipping_cost, free_shipping_threshold)
VALUES (true, 50, 500) ON CONFLICT (id) DO NOTHING;

-- Add shipping_cost column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC NOT NULL DEFAULT 0;

-- Allow admins to delete orders
CREATE POLICY "admins delete orders" ON public.orders FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admins delete order items" ON public.order_items FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Update place_order to apply shipping
CREATE OR REPLACE FUNCTION public.place_order(_customer_name text, _phone text, _address text, _notes text, _coupon_code text, _items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _order_id UUID;
  _item JSONB;
  _product RECORD;
  _subtotal NUMERIC := 0;
  _discount NUMERIC := 0;
  _total NUMERIC;
  _coupon RECORD;
  _applied_code TEXT := NULL;
  _total_items INT := 0;
  _user_orders_count INT := 0;
  _settings RECORD;
  _shipping NUMERIC := 0;
BEGIN
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products
      WHERE id = (_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'منتج غير موجود'; END IF;
    IF _product.quantity < (_item->>'quantity')::int THEN
      RAISE EXCEPTION 'الكمية غير متوفرة لـ %', _product.name;
    END IF;
    _subtotal := _subtotal + (_product.price * (_item->>'quantity')::int);
    _total_items := _total_items + (_item->>'quantity')::int;
  END LOOP;

  IF _coupon_code IS NOT NULL AND length(_coupon_code) > 0 THEN
    SELECT * INTO _coupon FROM public.coupons
      WHERE code = upper(_coupon_code) AND active = true
        AND (expires_at IS NULL OR expires_at > now());
    IF NOT FOUND THEN
      RAISE EXCEPTION 'كود الخصم غير صحيح أو منتهي الصلاحية';
    END IF;
    IF _coupon.first_order_only THEN
      IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'هذا الكوبون لأول طلب فقط — يجب تسجيل الدخول';
      END IF;
      SELECT count(*) INTO _user_orders_count FROM public.orders WHERE user_id = auth.uid();
      IF _user_orders_count > 0 THEN
        RAISE EXCEPTION 'هذا الكوبون صالح لأول طلب فقط';
      END IF;
    END IF;
    IF _coupon.min_subtotal > 0 AND _subtotal < _coupon.min_subtotal THEN
      RAISE EXCEPTION 'هذا الكوبون يتطلب حد أدنى للسلة %', _coupon.min_subtotal;
    END IF;
    IF _coupon.min_items > 0 AND _total_items < _coupon.min_items THEN
      RAISE EXCEPTION 'هذا الكوبون يتطلب % منتجات على الأقل', _coupon.min_items;
    END IF;
    _discount := round(_subtotal * _coupon.discount_percent / 100.0, 2);
    _applied_code := _coupon.code;
  END IF;

  SELECT * INTO _settings FROM public.site_settings WHERE id = true;
  IF FOUND THEN
    IF _subtotal >= _settings.free_shipping_threshold THEN
      _shipping := 0;
    ELSE
      _shipping := _settings.shipping_cost;
    END IF;
  END IF;

  _total := _subtotal - _discount + _shipping;

  INSERT INTO public.orders (user_id, customer_name, phone, address, notes, subtotal, discount, shipping_cost, total_price, coupon_code)
  VALUES (auth.uid(), _customer_name, _phone, _address, _notes, _subtotal, _discount, _shipping, _total, _applied_code)
  RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products WHERE id = (_item->>'product_id')::uuid;
    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, price)
    VALUES (_order_id, _product.id, _product.name, (_item->>'quantity')::int, _product.price);
    UPDATE public.products SET quantity = quantity - (_item->>'quantity')::int WHERE id = _product.id;
  END LOOP;

  RETURN _order_id;
END;
$function$;


CREATE TABLE public.site_content (
  id BOOLEAN PRIMARY KEY DEFAULT true CHECK (id = true),
  site_name TEXT NOT NULL DEFAULT 'طازج',
  site_tagline TEXT NOT NULL DEFAULT 'منتجات غذائية طبيعية',
  footer_description TEXT NOT NULL DEFAULT 'منتجات غذائية طبيعية 100% توصل لباب بيتك بأفضل جودة.',
  footer_contact TEXT NOT NULL DEFAULT 'الدفع عند الاستلام متوفر لجميع الطلبات',
  footer_copyright TEXT NOT NULL DEFAULT '© 2026 طازج. جميع الحقوق محفوظة.',
  footer_links JSONB NOT NULL DEFAULT '[{"label":"المنتجات","url":"/products"},{"label":"الطلبات","url":"/orders"},{"label":"التوصيل","url":"/"}]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.site_content ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone view site_content" ON public.site_content FOR SELECT USING (true);
CREATE POLICY "admins manage site_content" ON public.site_content FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.site_content (id) VALUES (true) ON CONFLICT DO NOTHING;

CREATE TABLE public.banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL DEFAULT 'hero',
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT,
  description TEXT,
  button_text TEXT,
  button_link TEXT DEFAULT '/products',
  image_url TEXT,
  badge_text TEXT,
  position INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone view active banners" ON public.banners FOR SELECT USING (active = true OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admins manage banners" ON public.banners FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.banners (type, title, subtitle, description, button_text, button_link, badge_text, position) VALUES
  ('hero', 'منتجات غذائية طازجة من المزرعة لباب بيتك', 'طبيعي 100% • توصيل سريع', 'ألبان، بيض، عسل، جبن، طحينة وأكثر — مختارة بعناية من أفضل المزارع المحلية. اطلب الآن وادفع عند الاستلام.', 'تسوق الآن', '/products', 'طبيعي 100%', 0),
  ('cta', 'احصل على خصم 10% على أول طلب', 'WELCOME10', 'استخدم كود الخصم عند إتمام الطلب', 'ابدأ التسوق', '/products', NULL, 0);

-- 1) Loyalty points balance per user
CREATE TABLE public.loyalty_points (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  total_spent INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own loyalty" ON public.loyalty_points
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage loyalty" ON public.loyalty_points
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

-- 2) Loyalty transactions log
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  order_id UUID,
  points INTEGER NOT NULL, -- positive earn, negative spend
  type TEXT NOT NULL CHECK (type IN ('earn','spend','adjust')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own loyalty tx" ON public.loyalty_transactions
  FOR SELECT USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "admins manage loyalty tx" ON public.loyalty_transactions
  FOR ALL USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE INDEX idx_loyalty_tx_user ON public.loyalty_transactions(user_id, created_at DESC);

-- 3) Add points columns to orders
ALTER TABLE public.orders
  ADD COLUMN points_used INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN points_discount NUMERIC NOT NULL DEFAULT 0,
  ADD COLUMN points_earned INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN points_awarded BOOLEAN NOT NULL DEFAULT false;

-- 4) Create loyalty row on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.loyalty_points (user_id) VALUES (NEW.id) ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- backfill loyalty rows for existing users
INSERT INTO public.loyalty_points (user_id)
SELECT id FROM auth.users
ON CONFLICT DO NOTHING;

-- 5) Updated place_order with loyalty support
CREATE OR REPLACE FUNCTION public.place_order(
  _customer_name text, _phone text, _address text, _notes text,
  _coupon_code text, _items jsonb, _points_to_use integer DEFAULT 0
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _order_id UUID;
  _item JSONB;
  _product RECORD;
  _subtotal NUMERIC := 0;
  _discount NUMERIC := 0;
  _total NUMERIC;
  _coupon RECORD;
  _applied_code TEXT := NULL;
  _total_items INT := 0;
  _user_orders_count INT := 0;
  _settings RECORD;
  _shipping NUMERIC := 0;
  _points_used INT := 0;
  _points_discount NUMERIC := 0;
  _user_balance INT := 0;
BEGIN
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products
      WHERE id = (_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'منتج غير موجود'; END IF;
    IF _product.quantity < (_item->>'quantity')::int THEN
      RAISE EXCEPTION 'الكمية غير متوفرة لـ %', _product.name;
    END IF;
    _subtotal := _subtotal + (_product.price * (_item->>'quantity')::int);
    _total_items := _total_items + (_item->>'quantity')::int;
  END LOOP;

  IF _coupon_code IS NOT NULL AND length(_coupon_code) > 0 THEN
    SELECT * INTO _coupon FROM public.coupons
      WHERE code = upper(_coupon_code) AND active = true
        AND (expires_at IS NULL OR expires_at > now());
    IF NOT FOUND THEN RAISE EXCEPTION 'كود الخصم غير صحيح أو منتهي الصلاحية'; END IF;
    IF _coupon.first_order_only THEN
      IF auth.uid() IS NULL THEN RAISE EXCEPTION 'هذا الكوبون لأول طلب فقط — يجب تسجيل الدخول'; END IF;
      SELECT count(*) INTO _user_orders_count FROM public.orders WHERE user_id = auth.uid();
      IF _user_orders_count > 0 THEN RAISE EXCEPTION 'هذا الكوبون صالح لأول طلب فقط'; END IF;
    END IF;
    IF _coupon.min_subtotal > 0 AND _subtotal < _coupon.min_subtotal THEN
      RAISE EXCEPTION 'هذا الكوبون يتطلب حد أدنى للسلة %', _coupon.min_subtotal;
    END IF;
    IF _coupon.min_items > 0 AND _total_items < _coupon.min_items THEN
      RAISE EXCEPTION 'هذا الكوبون يتطلب % منتجات على الأقل', _coupon.min_items;
    END IF;
    _discount := round(_subtotal * _coupon.discount_percent / 100.0, 2);
    _applied_code := _coupon.code;
  END IF;

  -- Loyalty points usage (mutually exclusive with coupon)
  IF _points_to_use > 0 THEN
    IF _applied_code IS NOT NULL THEN
      RAISE EXCEPTION 'لا يمكن استخدام النقاط مع كود خصم في نفس الطلب';
    END IF;
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'يجب تسجيل الدخول لاستخدام نقاط الولاء';
    END IF;
    SELECT balance INTO _user_balance FROM public.loyalty_points WHERE user_id = auth.uid() FOR UPDATE;
    IF COALESCE(_user_balance, 0) < _points_to_use THEN
      RAISE EXCEPTION 'رصيد النقاط غير كافٍ';
    END IF;
    -- Cap usage to subtotal (1 point = 1 EGP)
    _points_used := LEAST(_points_to_use, FLOOR(_subtotal)::int);
    _points_discount := _points_used;
  END IF;

  SELECT * INTO _settings FROM public.site_settings WHERE id = true;
  IF FOUND THEN
    IF _subtotal >= _settings.free_shipping_threshold THEN _shipping := 0;
    ELSE _shipping := _settings.shipping_cost; END IF;
  END IF;

  _total := GREATEST(0, _subtotal - _discount - _points_discount) + _shipping;

  INSERT INTO public.orders (user_id, customer_name, phone, address, notes, subtotal, discount, shipping_cost, total_price, coupon_code, points_used, points_discount)
  VALUES (auth.uid(), _customer_name, _phone, _address, _notes, _subtotal, _discount, _shipping, _total, _applied_code, _points_used, _points_discount)
  RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products WHERE id = (_item->>'product_id')::uuid;
    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, price)
    VALUES (_order_id, _product.id, _product.name, (_item->>'quantity')::int, _product.price);
    UPDATE public.products SET quantity = quantity - (_item->>'quantity')::int WHERE id = _product.id;
  END LOOP;

  -- Deduct loyalty points immediately
  IF _points_used > 0 THEN
    UPDATE public.loyalty_points
       SET balance = balance - _points_used,
           total_spent = total_spent + _points_used,
           updated_at = now()
     WHERE user_id = auth.uid();
    INSERT INTO public.loyalty_transactions (user_id, order_id, points, type, description)
    VALUES (auth.uid(), _order_id, -_points_used, 'spend', 'استخدام النقاط في طلب');
  END IF;

  RETURN _order_id;
END;
$$;

-- 6) Award points on delivery
CREATE OR REPLACE FUNCTION public.award_loyalty_on_delivery()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _earn INT;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered'
     AND NEW.points_awarded = false AND NEW.user_id IS NOT NULL THEN
    _earn := FLOOR(NEW.subtotal / 100)::int;
    IF _earn > 0 THEN
      INSERT INTO public.loyalty_points (user_id, balance, total_earned)
      VALUES (NEW.user_id, _earn, _earn)
      ON CONFLICT (user_id) DO UPDATE
        SET balance = loyalty_points.balance + _earn,
            total_earned = loyalty_points.total_earned + _earn,
            updated_at = now();
      INSERT INTO public.loyalty_transactions (user_id, order_id, points, type, description)
      VALUES (NEW.user_id, NEW.id, _earn, 'earn', 'نقاط من طلب تم توصيله');
    END IF;
    NEW.points_earned := _earn;
    NEW.points_awarded := true;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_award_loyalty
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.award_loyalty_on_delivery();

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS loyalty_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS loyalty_earn_per_amount numeric NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS loyalty_points_per_earn integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS loyalty_redeem_points integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS loyalty_redeem_value numeric NOT NULL DEFAULT 1;

-- Update place_order to use dynamic redemption rate
CREATE OR REPLACE FUNCTION public.place_order(_customer_name text, _phone text, _address text, _notes text, _coupon_code text, _items jsonb, _points_to_use integer DEFAULT 0)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _order_id UUID;
  _item JSONB;
  _product RECORD;
  _subtotal NUMERIC := 0;
  _discount NUMERIC := 0;
  _total NUMERIC;
  _coupon RECORD;
  _applied_code TEXT := NULL;
  _total_items INT := 0;
  _user_orders_count INT := 0;
  _settings RECORD;
  _shipping NUMERIC := 0;
  _points_used INT := 0;
  _points_discount NUMERIC := 0;
  _user_balance INT := 0;
  _redeem_rate NUMERIC := 1;
BEGIN
  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products
      WHERE id = (_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'منتج غير موجود'; END IF;
    IF _product.quantity < (_item->>'quantity')::int THEN
      RAISE EXCEPTION 'الكمية غير متوفرة لـ %', _product.name;
    END IF;
    _subtotal := _subtotal + (_product.price * (_item->>'quantity')::int);
    _total_items := _total_items + (_item->>'quantity')::int;
  END LOOP;

  SELECT * INTO _settings FROM public.site_settings WHERE id = true;

  IF _coupon_code IS NOT NULL AND length(_coupon_code) > 0 THEN
    SELECT * INTO _coupon FROM public.coupons
      WHERE code = upper(_coupon_code) AND active = true
        AND (expires_at IS NULL OR expires_at > now());
    IF NOT FOUND THEN RAISE EXCEPTION 'كود الخصم غير صحيح أو منتهي الصلاحية'; END IF;
    IF _coupon.first_order_only THEN
      IF auth.uid() IS NULL THEN RAISE EXCEPTION 'هذا الكوبون لأول طلب فقط — يجب تسجيل الدخول'; END IF;
      SELECT count(*) INTO _user_orders_count FROM public.orders WHERE user_id = auth.uid();
      IF _user_orders_count > 0 THEN RAISE EXCEPTION 'هذا الكوبون صالح لأول طلب فقط'; END IF;
    END IF;
    IF _coupon.min_subtotal > 0 AND _subtotal < _coupon.min_subtotal THEN
      RAISE EXCEPTION 'هذا الكوبون يتطلب حد أدنى للسلة %', _coupon.min_subtotal;
    END IF;
    IF _coupon.min_items > 0 AND _total_items < _coupon.min_items THEN
      RAISE EXCEPTION 'هذا الكوبون يتطلب % منتجات على الأقل', _coupon.min_items;
    END IF;
    _discount := round(_subtotal * _coupon.discount_percent / 100.0, 2);
    _applied_code := _coupon.code;
  END IF;

  -- Loyalty points usage (mutually exclusive with coupon)
  IF _points_to_use > 0 THEN
    IF _applied_code IS NOT NULL THEN
      RAISE EXCEPTION 'لا يمكن استخدام النقاط مع كود خصم في نفس الطلب';
    END IF;
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'يجب تسجيل الدخول لاستخدام نقاط الولاء';
    END IF;
    IF _settings.loyalty_enabled IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'نظام نقاط الولاء غير مفعّل حالياً';
    END IF;
    SELECT balance INTO _user_balance FROM public.loyalty_points WHERE user_id = auth.uid() FOR UPDATE;
    IF COALESCE(_user_balance, 0) < _points_to_use THEN
      RAISE EXCEPTION 'رصيد النقاط غير كافٍ';
    END IF;
    -- Redemption rate: loyalty_redeem_points points = loyalty_redeem_value EGP
    IF COALESCE(_settings.loyalty_redeem_points, 0) > 0 THEN
      _redeem_rate := _settings.loyalty_redeem_value / _settings.loyalty_redeem_points;
    END IF;
    _points_discount := LEAST(round(_points_to_use * _redeem_rate, 2), _subtotal);
    _points_used := _points_to_use;
  END IF;

  IF FOUND THEN
    IF _subtotal >= _settings.free_shipping_threshold THEN _shipping := 0;
    ELSE _shipping := _settings.shipping_cost; END IF;
  END IF;

  _total := GREATEST(0, _subtotal - _discount - _points_discount) + _shipping;

  INSERT INTO public.orders (user_id, customer_name, phone, address, notes, subtotal, discount, shipping_cost, total_price, coupon_code, points_used, points_discount)
  VALUES (auth.uid(), _customer_name, _phone, _address, _notes, _subtotal, _discount, _shipping, _total, _applied_code, _points_used, _points_discount)
  RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products WHERE id = (_item->>'product_id')::uuid;
    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, price)
    VALUES (_order_id, _product.id, _product.name, (_item->>'quantity')::int, _product.price);
    UPDATE public.products SET quantity = quantity - (_item->>'quantity')::int WHERE id = _product.id;
  END LOOP;

  IF _points_used > 0 THEN
    UPDATE public.loyalty_points
       SET balance = balance - _points_used,
           total_spent = total_spent + _points_used,
           updated_at = now()
     WHERE user_id = auth.uid();
    INSERT INTO public.loyalty_transactions (user_id, order_id, points, type, description)
    VALUES (auth.uid(), _order_id, -_points_used, 'spend', 'استخدام النقاط في طلب');
  END IF;

  RETURN _order_id;
END;
$function$;

-- Update award trigger function to use dynamic earn rate
CREATE OR REPLACE FUNCTION public.award_loyalty_on_delivery()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _earn INT;
  _settings RECORD;
BEGIN
  IF NEW.status = 'delivered' AND OLD.status IS DISTINCT FROM 'delivered'
     AND NEW.points_awarded = false AND NEW.user_id IS NOT NULL THEN
    SELECT * INTO _settings FROM public.site_settings WHERE id = true;
    IF NOT FOUND OR _settings.loyalty_enabled IS DISTINCT FROM true
       OR COALESCE(_settings.loyalty_earn_per_amount, 0) <= 0 THEN
      NEW.points_awarded := true;
      NEW.points_earned := 0;
      RETURN NEW;
    END IF;
    _earn := FLOOR(NEW.subtotal / _settings.loyalty_earn_per_amount)::int * _settings.loyalty_points_per_earn;
    IF _earn > 0 THEN
      INSERT INTO public.loyalty_points (user_id, balance, total_earned)
      VALUES (NEW.user_id, _earn, _earn)
      ON CONFLICT (user_id) DO UPDATE
        SET balance = loyalty_points.balance + _earn,
            total_earned = loyalty_points.total_earned + _earn,
            updated_at = now();
      INSERT INTO public.loyalty_transactions (user_id, order_id, points, type, description)
      VALUES (NEW.user_id, NEW.id, _earn, 'earn', 'نقاط من طلب تم توصيله');
    END IF;
    NEW.points_earned := _earn;
    NEW.points_awarded := true;
  END IF;
  RETURN NEW;
END;
$function$;


-- Add payment method settings
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS payment_cod_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS payment_vodafone_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_vodafone_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_etisalat_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_etisalat_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_orange_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_orange_number TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS payment_instapay_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_instapay_handle TEXT NOT NULL DEFAULT '';

-- Add payment fields to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS payment_reference TEXT;

-- Update place_order to accept payment method
CREATE OR REPLACE FUNCTION public.place_order(
  _customer_name text, _phone text, _address text, _notes text,
  _coupon_code text, _items jsonb, _points_to_use integer DEFAULT 0,
  _payment_method text DEFAULT 'cod', _payment_reference text DEFAULT NULL
)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _order_id UUID;
  _item JSONB;
  _product RECORD;
  _subtotal NUMERIC := 0;
  _discount NUMERIC := 0;
  _total NUMERIC;
  _coupon RECORD;
  _applied_code TEXT := NULL;
  _total_items INT := 0;
  _user_orders_count INT := 0;
  _settings RECORD;
  _shipping NUMERIC := 0;
  _points_used INT := 0;
  _points_discount NUMERIC := 0;
  _user_balance INT := 0;
  _redeem_rate NUMERIC := 1;
  _pm TEXT;
BEGIN
  _pm := COALESCE(NULLIF(_payment_method, ''), 'cod');

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products
      WHERE id = (_item->>'product_id')::uuid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'منتج غير موجود'; END IF;
    IF _product.quantity < (_item->>'quantity')::int THEN
      RAISE EXCEPTION 'الكمية غير متوفرة لـ %', _product.name;
    END IF;
    _subtotal := _subtotal + (_product.price * (_item->>'quantity')::int);
    _total_items := _total_items + (_item->>'quantity')::int;
  END LOOP;

  SELECT * INTO _settings FROM public.site_settings WHERE id = true;

  -- Validate payment method enabled
  IF _pm = 'cod' AND COALESCE(_settings.payment_cod_enabled, true) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'طريقة الدفع غير متاحة';
  ELSIF _pm = 'vodafone' AND COALESCE(_settings.payment_vodafone_enabled, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'طريقة الدفع غير متاحة';
  ELSIF _pm = 'etisalat' AND COALESCE(_settings.payment_etisalat_enabled, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'طريقة الدفع غير متاحة';
  ELSIF _pm = 'orange' AND COALESCE(_settings.payment_orange_enabled, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'طريقة الدفع غير متاحة';
  ELSIF _pm = 'instapay' AND COALESCE(_settings.payment_instapay_enabled, false) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'طريقة الدفع غير متاحة';
  ELSIF _pm NOT IN ('cod','vodafone','etisalat','orange','instapay') THEN
    RAISE EXCEPTION 'طريقة دفع غير صحيحة';
  END IF;

  -- Require reference for non-COD
  IF _pm <> 'cod' AND (_payment_reference IS NULL OR length(trim(_payment_reference)) < 4) THEN
    RAISE EXCEPTION 'يجب إدخال رقم العملية أو المرسل';
  END IF;

  IF _coupon_code IS NOT NULL AND length(_coupon_code) > 0 THEN
    SELECT * INTO _coupon FROM public.coupons
      WHERE code = upper(_coupon_code) AND active = true
        AND (expires_at IS NULL OR expires_at > now());
    IF NOT FOUND THEN RAISE EXCEPTION 'كود الخصم غير صحيح أو منتهي الصلاحية'; END IF;
    IF _coupon.first_order_only THEN
      IF auth.uid() IS NULL THEN RAISE EXCEPTION 'هذا الكوبون لأول طلب فقط — يجب تسجيل الدخول'; END IF;
      SELECT count(*) INTO _user_orders_count FROM public.orders WHERE user_id = auth.uid();
      IF _user_orders_count > 0 THEN RAISE EXCEPTION 'هذا الكوبون صالح لأول طلب فقط'; END IF;
    END IF;
    IF _coupon.min_subtotal > 0 AND _subtotal < _coupon.min_subtotal THEN
      RAISE EXCEPTION 'هذا الكوبون يتطلب حد أدنى للسلة %', _coupon.min_subtotal;
    END IF;
    IF _coupon.min_items > 0 AND _total_items < _coupon.min_items THEN
      RAISE EXCEPTION 'هذا الكوبون يتطلب % منتجات على الأقل', _coupon.min_items;
    END IF;
    _discount := round(_subtotal * _coupon.discount_percent / 100.0, 2);
    _applied_code := _coupon.code;
  END IF;

  IF _points_to_use > 0 THEN
    IF _applied_code IS NOT NULL THEN
      RAISE EXCEPTION 'لا يمكن استخدام النقاط مع كود خصم في نفس الطلب';
    END IF;
    IF auth.uid() IS NULL THEN
      RAISE EXCEPTION 'يجب تسجيل الدخول لاستخدام نقاط الولاء';
    END IF;
    IF _settings.loyalty_enabled IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'نظام نقاط الولاء غير مفعّل حالياً';
    END IF;
    SELECT balance INTO _user_balance FROM public.loyalty_points WHERE user_id = auth.uid() FOR UPDATE;
    IF COALESCE(_user_balance, 0) < _points_to_use THEN
      RAISE EXCEPTION 'رصيد النقاط غير كافٍ';
    END IF;
    IF COALESCE(_settings.loyalty_redeem_points, 0) > 0 THEN
      _redeem_rate := _settings.loyalty_redeem_value / _settings.loyalty_redeem_points;
    END IF;
    _points_discount := LEAST(round(_points_to_use * _redeem_rate, 2), _subtotal);
    _points_used := _points_to_use;
  END IF;

  IF _settings IS NOT NULL THEN
    IF _subtotal >= _settings.free_shipping_threshold THEN _shipping := 0;
    ELSE _shipping := _settings.shipping_cost; END IF;
  END IF;

  _total := GREATEST(0, _subtotal - _discount - _points_discount) + _shipping;

  INSERT INTO public.orders (user_id, customer_name, phone, address, notes, subtotal, discount, shipping_cost, total_price, coupon_code, points_used, points_discount, payment_method, payment_reference)
  VALUES (auth.uid(), _customer_name, _phone, _address, _notes, _subtotal, _discount, _shipping, _total, _applied_code, _points_used, _points_discount, _pm, NULLIF(trim(COALESCE(_payment_reference,'')), ''))
  RETURNING id INTO _order_id;

  FOR _item IN SELECT * FROM jsonb_array_elements(_items) LOOP
    SELECT * INTO _product FROM public.products WHERE id = (_item->>'product_id')::uuid;
    INSERT INTO public.order_items (order_id, product_id, product_name, quantity, price)
    VALUES (_order_id, _product.id, _product.name, (_item->>'quantity')::int, _product.price);
    UPDATE public.products SET quantity = quantity - (_item->>'quantity')::int WHERE id = _product.id;
  END LOOP;

  IF _points_used > 0 THEN
    UPDATE public.loyalty_points
       SET balance = balance - _points_used,
           total_spent = total_spent + _points_used,
           updated_at = now()
     WHERE user_id = auth.uid();
    INSERT INTO public.loyalty_transactions (user_id, order_id, points, type, description)
    VALUES (auth.uid(), _order_id, -_points_used, 'spend', 'استخدام النقاط في طلب');
  END IF;

  RETURN _order_id;
END;
$function$;


-- Notifications table
CREATE TABLE public.notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  order_id UUID,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'order_status',
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_notifications_user_created ON public.notifications(user_id, created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users view own notifications"
ON public.notifications FOR SELECT
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "users update own notifications"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "admins manage notifications"
ON public.notifications FOR ALL
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;

-- Trigger: notify on order status change
CREATE OR REPLACE FUNCTION public.notify_order_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _title TEXT;
  _message TEXT;
  _label TEXT;
BEGIN
  IF NEW.user_id IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  _label := CASE NEW.status::text
    WHEN 'pending' THEN 'قيد المراجعة'
    WHEN 'confirmed' THEN 'تم تأكيد طلبك'
    WHEN 'shipped' THEN 'طلبك في الطريق إليك'
    WHEN 'delivered' THEN 'تم توصيل طلبك بنجاح'
    WHEN 'cancelled' THEN 'تم إلغاء طلبك'
    ELSE NEW.status::text
  END;

  _title := _label;
  _message := 'طلب رقم #' || substr(NEW.id::text, 1, 8) || ' — ' || _label;

  INSERT INTO public.notifications (user_id, order_id, title, message, type)
  VALUES (NEW.user_id, NEW.id, _title, _message, 'order_status');

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_order_status
AFTER UPDATE OF status ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_status_change();


-- Add old/compare price to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS old_price NUMERIC;

-- Trigger to notify all admins when a new order is placed
CREATE OR REPLACE FUNCTION public.notify_admins_new_order()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _admin RECORD;
  _title TEXT;
  _msg TEXT;
BEGIN
  _title := 'طلب جديد';
  _msg := 'طلب جديد #' || substr(NEW.id::text, 1, 8) || ' بقيمة ' || NEW.total_price || ' ج.م من ' || NEW.customer_name;
  FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (user_id, order_id, title, message, type)
    VALUES (_admin.user_id, NEW.id, _title, _msg, 'new_order');
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_new_order ON public.orders;
CREATE TRIGGER trg_notify_admins_new_order
AFTER INSERT ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_admins_new_order();

-- Ensure status-change trigger exists (re-create for safety, idempotent)
DROP TRIGGER IF EXISTS trg_notify_order_status_change ON public.orders;
CREATE TRIGGER trg_notify_order_status_change
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.notify_order_status_change();

