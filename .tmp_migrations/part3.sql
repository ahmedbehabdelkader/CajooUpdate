
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS otp_code text,
  ADD COLUMN IF NOT EXISTS otp_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS otp_attempts int NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verification_method text;

-- Replace place_order to take email and create as pending_verification with an OTP
CREATE OR REPLACE FUNCTION public.place_order(
  _customer_name text, _phone text, _address text, _notes text,
  _coupon_code text, _items jsonb,
  _points_to_use integer DEFAULT 0,
  _payment_method text DEFAULT 'cod'::text,
  _payment_reference text DEFAULT NULL::text,
  _customer_email text DEFAULT NULL::text
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
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
  _otp TEXT;
BEGIN
  _pm := COALESCE(NULLIF(_payment_method, ''), 'cod');

  IF _customer_email IS NULL OR length(trim(_customer_email)) < 5 OR position('@' in _customer_email) = 0 THEN
    RAISE EXCEPTION 'بريد إلكتروني غير صحيح';
  END IF;

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
    IF _applied_code IS NOT NULL THEN RAISE EXCEPTION 'لا يمكن استخدام النقاط مع كود خصم في نفس الطلب'; END IF;
    IF auth.uid() IS NULL THEN RAISE EXCEPTION 'يجب تسجيل الدخول لاستخدام نقاط الولاء'; END IF;
    IF _settings.loyalty_enabled IS DISTINCT FROM true THEN RAISE EXCEPTION 'نظام نقاط الولاء غير مفعّل حالياً'; END IF;
    SELECT balance INTO _user_balance FROM public.loyalty_points WHERE user_id = auth.uid() FOR UPDATE;
    IF COALESCE(_user_balance, 0) < _points_to_use THEN RAISE EXCEPTION 'رصيد النقاط غير كافٍ'; END IF;
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

  _otp := lpad((floor(random() * 1000000))::int::text, 6, '0');

  INSERT INTO public.orders (
    user_id, customer_name, phone, address, notes,
    subtotal, discount, shipping_cost, total_price, coupon_code,
    points_used, points_discount, payment_method, payment_reference,
    customer_email, status, otp_code, otp_expires_at, verification_method
  )
  VALUES (
    auth.uid(), _customer_name, _phone, _address, _notes,
    _subtotal, _discount, _shipping, _total, _applied_code,
    _points_used, _points_discount, _pm, NULLIF(trim(COALESCE(_payment_reference,'')), ''),
    lower(trim(_customer_email)), 'pending_verification', _otp, now() + interval '10 minutes', 'email'
  )
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

-- Verify OTP function (callable by anyone who has the order id; rate-limited via attempts)
CREATE OR REPLACE FUNCTION public.verify_order_otp(_order_id uuid, _code text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _o RECORD;
BEGIN
  SELECT * INTO _o FROM public.orders WHERE id = _order_id FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'الطلب غير موجود'); END IF;
  IF _o.status <> 'pending_verification' THEN
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;
  IF _o.otp_attempts >= 5 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'تم تجاوز عدد المحاولات. اطلب كوداً جديداً.');
  END IF;
  IF _o.otp_expires_at IS NULL OR _o.otp_expires_at < now() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'انتهت صلاحية الكود. اطلب كوداً جديداً.');
  END IF;
  IF _o.otp_code IS DISTINCT FROM trim(_code) THEN
    UPDATE public.orders SET otp_attempts = otp_attempts + 1 WHERE id = _order_id;
    RETURN jsonb_build_object('ok', false, 'error', 'كود التحقق غير صحيح');
  END IF;
  UPDATE public.orders
     SET status = 'pending', verified_at = now(), otp_code = NULL, otp_expires_at = NULL
   WHERE id = _order_id;
  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- Trigger: notify admins only when status becomes 'pending' (i.e. after verification or admin manual confirm)
DROP TRIGGER IF EXISTS trg_notify_admins_new_order ON public.orders;
CREATE OR REPLACE FUNCTION public.notify_admins_after_verify()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _admin RECORD;
  _title TEXT;
  _msg TEXT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'pending')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'pending' AND OLD.status = 'pending_verification') THEN
    _title := 'طلب جديد مؤكد';
    _msg := 'طلب جديد #' || substr(NEW.id::text, 1, 8) || ' بقيمة ' || NEW.total_price || ' ج.م من ' || NEW.customer_name;
    FOR _admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, order_id, title, message, type)
      VALUES (_admin.user_id, NEW.id, _title, _msg, 'new_order');
    END LOOP;
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_notify_admins_after_verify ON public.orders;
CREATE TRIGGER trg_notify_admins_after_verify
AFTER INSERT OR UPDATE OF status ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_after_verify();

-- Allow customer (signed in or not) to read their order's status by id via this RPC
CREATE OR REPLACE FUNCTION public.get_order_verification_status(_order_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _o RECORD;
BEGIN
  SELECT id, status, customer_email, otp_expires_at FROM public.orders WHERE id = _order_id INTO _o;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false); END IF;
  RETURN jsonb_build_object(
    'ok', true,
    'status', _o.status,
    'email_masked', regexp_replace(_o.customer_email, '(.).*(@.*)', '\1***\2'),
    'expires_at', _o.otp_expires_at
  );
END;
$function$;
