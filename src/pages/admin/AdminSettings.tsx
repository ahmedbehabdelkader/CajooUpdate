import { useEffect, useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const AdminSettings = () => {
  const [shippingCost, setShippingCost] = useState(0);
  const [threshold, setThreshold] = useState(0);
  const [loyaltyEnabled, setLoyaltyEnabled] = useState(true);
  const [earnPerAmount, setEarnPerAmount] = useState(100);
  const [pointsPerEarn, setPointsPerEarn] = useState(1);
  const [redeemPoints, setRedeemPoints] = useState(1);
  const [redeemValue, setRedeemValue] = useState(1);
  const [pay, setPay] = useState({
    cod_enabled: true,
    vodafone_enabled: false, vodafone_number: "",
    etisalat_enabled: false, etisalat_number: "",
    orange_enabled: false, orange_number: "",
    instapay_enabled: false, instapay_handle: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "إعدادات المتجر";
    supabase.from("site_settings").select("*").eq("id", true).maybeSingle()
      .then(({ data }) => {
        if (data) {
          const d = data as any;
          setShippingCost(Number(d.shipping_cost));
          setThreshold(Number(d.free_shipping_threshold));
          setLoyaltyEnabled(d.loyalty_enabled ?? true);
          setEarnPerAmount(Number(d.loyalty_earn_per_amount ?? 100));
          setPointsPerEarn(Number(d.loyalty_points_per_earn ?? 1));
          setRedeemPoints(Number(d.loyalty_redeem_points ?? 1));
          setRedeemValue(Number(d.loyalty_redeem_value ?? 1));
          setPay({
            cod_enabled: d.payment_cod_enabled ?? true,
            vodafone_enabled: d.payment_vodafone_enabled ?? false,
            vodafone_number: d.payment_vodafone_number ?? "",
            etisalat_enabled: d.payment_etisalat_enabled ?? false,
            etisalat_number: d.payment_etisalat_number ?? "",
            orange_enabled: d.payment_orange_enabled ?? false,
            orange_number: d.payment_orange_number ?? "",
            instapay_enabled: d.payment_instapay_enabled ?? false,
            instapay_handle: d.payment_instapay_handle ?? "",
          });
        }
      });
  }, []);

  const save = async () => {
    setLoading(true);
    const { error } = await supabase.from("site_settings").update({
      shipping_cost: shippingCost,
      free_shipping_threshold: threshold,
      loyalty_enabled: loyaltyEnabled,
      loyalty_earn_per_amount: earnPerAmount,
      loyalty_points_per_earn: pointsPerEarn,
      loyalty_redeem_points: redeemPoints,
      loyalty_redeem_value: redeemValue,
      payment_cod_enabled: pay.cod_enabled,
      payment_vodafone_enabled: pay.vodafone_enabled,
      payment_vodafone_number: pay.vodafone_number,
      payment_etisalat_enabled: pay.etisalat_enabled,
      payment_etisalat_number: pay.etisalat_number,
      payment_orange_enabled: pay.orange_enabled,
      payment_orange_number: pay.orange_number,
      payment_instapay_enabled: pay.instapay_enabled,
      payment_instapay_handle: pay.instapay_handle,
      updated_at: new Date().toISOString(),
    } as any).eq("id", true);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("تم حفظ الإعدادات");
  };

  return (
    <AdminLayout>
      <h1 className="text-2xl font-extrabold mb-6">إعدادات المتجر</h1>

      <div className="max-w-xl space-y-4 p-6 bg-background rounded-xl border border-border shadow-card mb-6">
        <h2 className="font-bold text-lg">الشحن</h2>
        <div>
          <Label htmlFor="ship">تكلفة الشحن (ج.م)</Label>
          <Input id="ship" type="number" min="0" step="0.01" value={shippingCost}
            onChange={(e) => setShippingCost(Number(e.target.value))} />
        </div>
        <div>
          <Label htmlFor="thr">الحد الأدنى للشحن المجاني (ج.م)</Label>
          <Input id="thr" type="number" min="0" step="0.01" value={threshold}
            onChange={(e) => setThreshold(Number(e.target.value))} />
          <p className="text-xs text-muted-foreground mt-1">
            عند تجاوز هذا المبلغ في إجمالي السلة، يصبح الشحن مجاني.
          </p>
        </div>
      </div>

      <div className="max-w-xl space-y-4 p-6 bg-background rounded-xl border border-border shadow-card mb-6">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">نقاط الولاء</h2>
          <div className="flex items-center gap-2">
            <Label htmlFor="loy-en" className="text-sm">مفعّل</Label>
            <Switch id="loy-en" checked={loyaltyEnabled} onCheckedChange={setLoyaltyEnabled} />
          </div>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <p className="font-semibold text-sm">قاعدة كسب النقاط</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="earn-pts">عدد النقاط</Label>
              <Input id="earn-pts" type="number" min="0" step="1" value={pointsPerEarn}
                onChange={(e) => setPointsPerEarn(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="earn-amt">لكل (ج.م)</Label>
              <Input id="earn-amt" type="number" min="1" step="1" value={earnPerAmount}
                onChange={(e) => setEarnPerAmount(Number(e.target.value))} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            مثال: {pointsPerEarn} نقطة لكل {earnPerAmount} ج.م من قيمة الطلب (تُمنح بعد التوصيل).
          </p>
        </div>

        <div className="space-y-3 border-t border-border pt-4">
          <p className="font-semibold text-sm">قاعدة استبدال النقاط</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="rd-pts">كل (نقطة)</Label>
              <Input id="rd-pts" type="number" min="1" step="1" value={redeemPoints}
                onChange={(e) => setRedeemPoints(Number(e.target.value))} />
            </div>
            <div>
              <Label htmlFor="rd-val">تساوي (ج.م)</Label>
              <Input id="rd-val" type="number" min="0" step="0.01" value={redeemValue}
                onChange={(e) => setRedeemValue(Number(e.target.value))} />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            مثال: كل {redeemPoints} نقطة = {redeemValue} ج.م خصم عند الشراء.
          </p>
        </div>
      </div>

      <div className="max-w-xl space-y-4 p-6 bg-background rounded-xl border border-border shadow-card mb-6">
        <h2 className="font-bold text-lg">طرق الدفع</h2>

        <div className="flex items-center justify-between border-t border-border pt-4">
          <div>
            <p className="font-semibold text-sm">الدفع عند الاستلام</p>
            <p className="text-xs text-muted-foreground">العميل يدفع كاش عند التوصيل</p>
          </div>
          <Switch checked={pay.cod_enabled} onCheckedChange={(v) => setPay({ ...pay, cod_enabled: v })} />
        </div>

        {([
          { key: "vodafone", label: "فودافون كاش", numKey: "vodafone_number" },
          { key: "etisalat", label: "اتصالات كاش", numKey: "etisalat_number" },
          { key: "orange", label: "أورانج كاش", numKey: "orange_number" },
        ] as const).map((m) => (
          <div key={m.key} className="space-y-2 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-sm">{m.label}</p>
              <Switch
                checked={(pay as any)[`${m.key}_enabled`]}
                onCheckedChange={(v) => setPay({ ...pay, [`${m.key}_enabled`]: v } as any)}
              />
            </div>
            {(pay as any)[`${m.key}_enabled`] && (
              <div>
                <Label>رقم المحفظة</Label>
                <Input
                  value={(pay as any)[m.numKey]}
                  onChange={(e) => setPay({ ...pay, [m.numKey]: e.target.value } as any)}
                  placeholder="01xxxxxxxxx"
                  dir="ltr"
                />
              </div>
            )}
          </div>
        ))}

        <div className="space-y-2 border-t border-border pt-4">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">إنستا باي (InstaPay)</p>
            <Switch
              checked={pay.instapay_enabled}
              onCheckedChange={(v) => setPay({ ...pay, instapay_enabled: v })}
            />
          </div>
          {pay.instapay_enabled && (
            <div>
              <Label>عنوان الدفع (IPA) أو رقم الحساب</Label>
              <Input
                value={pay.instapay_handle}
                onChange={(e) => setPay({ ...pay, instapay_handle: e.target.value })}
                placeholder="yourname@instapay"
                dir="ltr"
              />
            </div>
          )}
        </div>
      </div>

      <Button onClick={save} disabled={loading} className="gradient-warm border-0">
        {loading ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
      </Button>
    </AdminLayout>
  );
};
export default AdminSettings;
