CREATE OR REPLACE FUNCTION public.place_order(_customer_name text, _phone text, _address text, _notes text, _coupon_code text, _items jsonb, _points_to_use integer DEFAULT 0, _payment_method text DEFAULT 'cod'::text, _payment_reference text DEFAULT NULL::text, _customer_email text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _order_id UUID; _item JSONB; _product RECORD;
  _subtotal NUMERIC := 0; _discount NUMERIC := 0; _total NUMERIC;
  _coupon RECORD; _applied_code TEXT := NULL;
  _total_items INT := 0; _user_orders_count INT := 0;
  _settings RECORD; _shipping NUMERIC := 0;
  _points_used INT := 0; _points_discount NUMERIC := 0;
  _user_balance INT := 0; _redeem_rate NUMERIC := 1;
  _pm TEXT;
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

  INSERT INTO public.orders (
    user_id, customer_name, phone, address, notes,
    subtotal, discount, shipping_cost, total_price,
    coupon_code, points_used, points_discount,
    payment_method, payment_reference, customer_email,
    status, verified_at, verification_method
  )
  VALUES (
    auth.uid(), _customer_name, _phone, _address, _notes,
    _subtotal, _discount, _shipping, _total,
    _applied_code, _points_used, _points_discount,
    _pm, NULLIF(trim(COALESCE(_payment_reference,'')), ''), _customer_email,
    'pending_verification', NULL, 'manual'
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