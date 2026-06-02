import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { CheckCircle2, Tag, X, Sparkles, Wallet, Copy, Phone, Send } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const schema = z.object({
  customer_name: z.string().trim().min(2, "الاسم قصير جداً").max(100),
  phone: z.string().trim().regex(/^[0-9+\-\s]{8,20}$/, "رقم هاتف غير صحيح"),
  address: z.string().trim().min(10, "العنوان قصير").max(500),
  notes: z.string().max(500).optional(),
});

const Checkout = () => {
  const { items, subtotal, clear } = useCart();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ customer_name: "", phone: "", address: "", notes: "" });
  const [coupon, setCoupon] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [applying, setApplying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<any>({
    shipping_cost: 0, free_shipping_threshold: 0,
    loyalty_enabled: true, loyalty_redeem_points: 1, loyalty_redeem_value: 1,
    payment_cod_enabled: true,
    payment_vodafone_enabled: false, payment_vodafone_number: "",
    payment_etisalat_enabled: false, payment_etisalat_number: "",
    payment_orange_enabled: false, payment_orange_number: "",
    payment_instapay_enabled: false, payment_instapay_handle: "",
  });
  const [pointsBalance, setPointsBalance] = useState(0);
  const [usePoints, setUsePoints] = useState(false);
  const [pointsToUse, setPointsToUse] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string>("cod");
  const [paymentReference, setPaymentReference] = useState("");

  const totalItems = items.reduce((s, i) => s + i.quantity, 0);
  const discountAmount = appliedCoupon?.discount ?? 0;
  const redeemRate = settings.loyalty_redeem_points > 0 ? settings.loyalty_redeem_value / settings.loyalty_redeem_points : 0;
  // Max points such that points * rate <= subtotal
  const maxUsablePoints = redeemRate > 0
    ? Math.min(pointsBalance, Math.floor(subtotal / redeemRate))
    : 0;
  const effectivePoints = usePoints && !appliedCoupon ? Math.min(pointsToUse, maxUsablePoints) : 0;
  const pointsDiscount = Math.min(effectivePoints * redeemRate, subtotal);
  const shipping = subtotal >= settings.free_shipping_threshold ? 0 : settings.shipping_cost;
  const total = Math.max(0, subtotal - discountAmount - pointsDiscount) + shipping;

  useEffect(() => {
    supabase.from("site_settings").select("*").eq("id", true).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setSettings({
            shipping_cost: Number(d.shipping_cost),
            free_shipping_threshold: Number(d.free_shipping_threshold),
            loyalty_enabled: d.loyalty_enabled ?? true,
            loyalty_redeem_points: Number(d.loyalty_redeem_points ?? 1),
            loyalty_redeem_value: Number(d.loyalty_redeem_value ?? 1),
            payment_cod_enabled: d.payment_cod_enabled ?? true,
            payment_vodafone_enabled: d.payment_vodafone_enabled ?? false,
            payment_vodafone_number: d.payment_vodafone_number ?? "",
            payment_etisalat_enabled: d.payment_etisalat_enabled ?? false,
            payment_etisalat_number: d.payment_etisalat_number ?? "",
            payment_orange_enabled: d.payment_orange_enabled ?? false,
            payment_orange_number: d.payment_orange_number ?? "",
            payment_instapay_enabled: d.payment_instapay_enabled ?? false,
            payment_instapay_handle: d.payment_instapay_handle ?? "",
          });
          // Default selected method to first enabled
          const first = d.payment_cod_enabled ? "cod"
            : d.payment_vodafone_enabled ? "vodafone"
            : d.payment_etisalat_enabled ? "etisalat"
            : d.payment_orange_enabled ? "orange"
            : d.payment_instapay_enabled ? "instapay" : "cod";
          setPaymentMethod(first);
        }
      });
  }, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("loyalty_points").select("balance").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => {
        const b = data?.balance ?? 0;
        setPointsBalance(b);
        setPointsToUse(redeemRate > 0 ? Math.min(b, Math.floor(subtotal / redeemRate)) : 0);
      });
  }, [user, subtotal, redeemRate]);

  const applyCoupon = async () => {
    const code = coupon.trim().toUpperCase();
    if (!code) return toast.error("أدخل كود الخصم");
    setApplying(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code)
      .eq("active", true)
      .maybeSingle();
    setApplying(false);
    if (error || !data) return toast.error("كود الخصم غير صحيح");
    if (data.expires_at && new Date(data.expires_at) < new Date())
      return toast.error("كود الخصم منتهي الصلاحية");
    if (data.min_subtotal > 0 && subtotal < Number(data.min_subtotal))
      return toast.error(`هذا الكوبون يتطلب حد أدنى ${data.min_subtotal} ج.م`);
    if (data.min_items > 0 && totalItems < data.min_items)
      return toast.error(`هذا الكوبون يتطلب ${data.min_items} منتجات على الأقل`);
    if (data.first_order_only) {
      if (!user) return toast.error("هذا الكوبون لأول طلب فقط");
      const { count } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if ((count ?? 0) > 0) return toast.error("هذا الكوبون صالح لأول طلب فقط");
    }
    const discount = Math.round((subtotal * data.discount_percent) / 100 * 100) / 100;
    setAppliedCoupon({ code: data.code, discount });
    toast.success(`تم تفعيل الخصم ${data.discount_percent}%`);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCoupon("");
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      toast.info("يجب تسجيل الدخول لإتمام الطلب");
      navigate("/auth?redirect=/checkout", { replace: true });
      return;
    }
    if (items.length === 0 && !loading) {
      navigate("/cart", { replace: true });
    }
  }, [authLoading, user, items.length, loading, navigate]);

  if (authLoading || !user) {
    return (
      <Layout>
        <div className="container py-20 text-center text-muted-foreground">جارٍ التحقق...</div>
      </Layout>
    );
  }

  const paymentOptions = [
    { v: "cod", label: "الدفع عند الاستلام", enabled: settings.payment_cod_enabled, account: "" },
    { v: "vodafone", label: "فودافون كاش", enabled: settings.payment_vodafone_enabled, account: settings.payment_vodafone_number },
    { v: "etisalat", label: "اتصالات كاش", enabled: settings.payment_etisalat_enabled, account: settings.payment_etisalat_number },
    { v: "orange", label: "أورانج كاش", enabled: settings.payment_orange_enabled, account: settings.payment_orange_number },
    { v: "instapay", label: "إنستا باي", enabled: settings.payment_instapay_enabled, account: settings.payment_instapay_handle },
  ].filter((o) => o.enabled);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.errors[0].message);
      return;
    }
    if (!paymentMethod) return toast.error("اختر طريقة الدفع");
    if (paymentMethod !== "cod" && paymentReference.trim().length < 4) {
      return toast.error("أدخل رقم العملية أو رقم المرسل");
    }
    setLoading(true);
    const { data, error } = await supabase.rpc("place_order", {
      _customer_name: form.customer_name,
      _phone: form.phone,
      _address: form.address,
      _notes: form.notes || null,
      _coupon_code: appliedCoupon?.code ?? null,
      _items: items.map((i) => ({ product_id: i.id, quantity: i.quantity })),
      _points_to_use: effectivePoints,
      _payment_method: paymentMethod,
      _payment_reference: paymentMethod === "cod" ? null : paymentReference.trim(),
      _customer_email: (user?.email || "noreply@cajoo.com").trim().toLowerCase(),
    } as any);
    setLoading(false);
    if (error) {
      toast.error(error.message || "تعذر إتمام الطلب");
      return;
    }
    clear();
    toast.success("تم استلام طلبك بنجاح");
    navigate(`/order-success/${data}`);
  };

  return (
    <Layout>
      <div className="container py-6 md:py-10">
        <h1 className="text-2xl sm:text-3xl font-extrabold mb-6 md:mb-8">إتمام الطلب</h1>
        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-4 p-5 sm:p-6 gradient-card rounded-2xl border border-border/60 shadow-card">
            <h2 className="font-bold text-lg">بيانات التوصيل</h2>
            <div>
              <Label htmlFor="customer_name">الاسم الكامل *</Label>
              <Input id="customer_name" value={form.customer_name}
                onChange={(e) => setForm({ ...form, customer_name: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="phone">رقم الهاتف *</Label>
              <Input id="phone" type="tel" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="address">العنوان كاملاً *</Label>
              <Textarea id="address" value={form.address} rows={3}
                onChange={(e) => setForm({ ...form, address: e.target.value })} required />
            </div>
            <div>
              <Label htmlFor="notes">ملاحظات (اختياري)</Label>
              <Textarea id="notes" value={form.notes} rows={2}
                onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </div>
          </div>

          <div className="space-y-4 p-5 sm:p-6 gradient-card rounded-2xl border border-border/60 shadow-card lg:col-start-1 lg:row-start-2">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              <h2 className="font-bold text-lg">طريقة الدفع</h2>
            </div>
            {paymentOptions.length === 0 ? (
              <p className="text-sm text-muted-foreground">لا توجد طرق دفع متاحة حالياً</p>
            ) : (
              <RadioGroup value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v); setPaymentReference(""); }}>
                <div className="space-y-2">
                  {paymentOptions.map((opt) => (
                    <label
                      key={opt.v}
                      htmlFor={`pm-${opt.v}`}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${
                        paymentMethod === opt.v ? "border-primary bg-primary/5" : "border-border bg-background"
                      }`}
                    >
                      <RadioGroupItem id={`pm-${opt.v}`} value={opt.v} className="mt-1" />
                      <div className="flex-1 space-y-2">
                        <div className="font-semibold">{opt.label}</div>
                        {opt.v !== "cod" && opt.account && (
                          <div className="text-sm bg-secondary/50 rounded-md p-2 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="text-xs text-muted-foreground">
                                  {opt.v === "instapay" ? "حوّل إلى" : "حوّل إلى الرقم"}
                                </div>
                                <div className="font-mono font-bold" dir="ltr">{opt.account}</div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.preventDefault();
                                  navigator.clipboard?.writeText(opt.account);
                                  toast.success("تم النسخ");
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                            {paymentMethod === opt.v && (
                              <div className="flex flex-wrap gap-2 pt-1 border-t border-border/40">
                                {opt.v === "instapay" ? (
                                  <div className="w-full">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.preventDefault();
                                        navigator.clipboard?.writeText(opt.account);
                                        toast.success("تم نسخ عنوان إنستا باي");
                                      }}
                                    >
                                      <Copy className="h-4 w-4 ml-1" />
                                      نسخ العنوان
                                    </Button>
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      const amt = Math.round(total);
                                      const num = opt.account.replace(/\D/g, "");
                                      let ussd = "";
                                      if (opt.v === "vodafone") ussd = `*9*7*${num}*${amt}#`;
                                      else if (opt.v === "etisalat") ussd = `*777*1*${amt}*${num}#`;
                                      else if (opt.v === "orange") ussd = `#7*${num}*${amt}#`;
                                      const tel = `tel:${encodeURIComponent(ussd)}`;
                                      window.location.href = tel;
                                    }}
                                  >
                                    <Phone className="h-4 w-4 ml-1" />
                                    اتصال تلقائي للتحويل ({total.toFixed(2)} ج.م)
                                  </Button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                        {paymentMethod === opt.v && opt.v !== "cod" && (
                          <div>
                            <Label htmlFor="pay-ref" className="text-xs">
                              رقم العملية / رقم المرسل *
                            </Label>
                            <Input
                              id="pay-ref"
                              value={paymentReference}
                              onChange={(e) => setPaymentReference(e.target.value)}
                              placeholder="أدخل رقم التحويل"
                              dir="ltr"
                              required
                            />
                          </div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </RadioGroup>
            )}
            {paymentMethod === "cod" && (
              <div className="flex items-start gap-2 p-3 bg-success/10 rounded-lg text-sm">
                <CheckCircle2 className="h-5 w-5 text-success mt-0.5 flex-shrink-0" />
                <p>الدفع عند الاستلام — لا حاجة لبطاقة بنكية</p>
              </div>
            )}
          </div>


          <aside className="h-fit p-5 sm:p-6 gradient-card rounded-2xl border border-border/60 shadow-card space-y-4">
            <h3 className="font-bold text-lg">ملخص الطلب</h3>
            <div className="space-y-2 text-sm">
              {items.map((i) => (
                <div key={i.id} className="flex justify-between">
                  <span className="text-muted-foreground">{i.name} × {i.quantity}</span>
                  <span>{(i.price * i.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>
            {!appliedCoupon ? (
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="كود الخصم"
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    className="pr-10 uppercase"
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={applyCoupon}
                  disabled={applying || !coupon.trim()}
                >
                  {applying ? "..." : "تفعيل"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2 p-3 bg-success/10 rounded-lg text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="font-mono font-bold">{appliedCoupon.code}</span>
                  <span className="text-muted-foreground">مفعّل</span>
                </div>
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={removeCoupon}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            {settings.loyalty_enabled && pointsBalance > 0 && (
              <div className="p-3 rounded-lg border border-border/60 bg-secondary/40 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="font-semibold">نقاط الولاء</span>
                    <span className="text-muted-foreground">({pointsBalance} نقطة)</span>
                  </div>
                  <Switch
                    checked={usePoints}
                    onCheckedChange={(v) => setUsePoints(v)}
                    disabled={!!appliedCoupon || maxUsablePoints === 0}
                  />
                </div>
                {appliedCoupon && (
                  <p className="text-xs text-muted-foreground">لا يمكن الجمع بين النقاط وكود الخصم</p>
                )}
                {usePoints && !appliedCoupon && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={maxUsablePoints}
                        value={pointsToUse}
                        onChange={(e) => setPointsToUse(Math.max(0, Math.min(maxUsablePoints, Number(e.target.value) || 0)))}
                        className="h-9"
                      />
                      <Button type="button" variant="outline" size="sm" onClick={() => setPointsToUse(maxUsablePoints)}>
                        الكل
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {settings.loyalty_redeem_points} نقطة = {settings.loyalty_redeem_value} ج.م خصم • متاح حتى {maxUsablePoints} نقطة
                    </p>
                  </div>
                )}
              </div>
            )}
            <div className="border-t border-border pt-3 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">السعر قبل الخصم</span>
                <span className={appliedCoupon ? "line-through text-muted-foreground" : "font-semibold"}>
                  {subtotal.toFixed(2)} ج.م
                </span>
              </div>
              {appliedCoupon && (
                <div className="flex justify-between text-success">
                  <span>الخصم</span>
                  <span className="font-semibold">- {discountAmount.toFixed(2)} ج.م</span>
                </div>
              )}
              {pointsDiscount > 0 && (
                <div className="flex justify-between text-success">
                  <span>خصم النقاط ({effectivePoints} نقطة)</span>
                  <span className="font-semibold">- {pointsDiscount.toFixed(2)} ج.م</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">الشحن</span>
                {shipping === 0 ? (
                  <span className="font-semibold text-success">مجاني</span>
                ) : (
                  <span className="font-semibold">{shipping.toFixed(2)} ج.م</span>
                )}
              </div>
              {shipping > 0 && settings.free_shipping_threshold > 0 && (
                <p className="text-xs text-muted-foreground">
                  أضف {(settings.free_shipping_threshold - subtotal).toFixed(2)} ج.م للحصول على شحن مجاني
                </p>
              )}
              <div className="flex justify-between text-lg pt-2 border-t border-border">
                <span className="font-bold">الإجمالي</span>
                <span className="font-extrabold text-primary">{total.toFixed(2)} ج.م</span>
              </div>
            </div>
            <Button type="submit" disabled={loading} className="w-full gradient-warm border-0 shadow-warm h-12 text-base">
              {loading ? "جارٍ الإرسال..." : "تأكيد الطلب"}
            </Button>
          </aside>
        </form>
      </div>
    </Layout>
  );
};

export default Checkout;
