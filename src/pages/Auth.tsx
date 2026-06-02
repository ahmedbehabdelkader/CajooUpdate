import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const emailSchema = z.string().trim().email("بريد إلكتروني غير صحيح").max(255);
const pwSchema = z.string().min(6, "كلمة المرور 6 أحرف على الأقل").max(72);

const Auth = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get("redirect") || "/";
  const [loading, setLoading] = useState(false);
  const [signin, setSignin] = useState({ email: "", password: "" });
  const [signup, setSignup] = useState({ email: "", password: "", full_name: "" });

  useEffect(() => {
    document.title = "تسجيل الدخول | طازج";
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate(redirect, { replace: true });
    });
  }, [navigate, redirect]);

  const handleSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    const ev = emailSchema.safeParse(signin.email);
    const pv = pwSchema.safeParse(signin.password);
    if (!ev.success) return toast.error(ev.error.errors[0].message);
    if (!pv.success) return toast.error(pv.error.errors[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(signin);
    setLoading(false);
    if (error) return toast.error(error.message === "Invalid login credentials" ? "بيانات الدخول غير صحيحة" : error.message);
    toast.success("مرحباً بعودتك!");
    navigate(redirect, { replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const ev = emailSchema.safeParse(signup.email);
    const pv = pwSchema.safeParse(signup.password);
    if (!ev.success) return toast.error(ev.error.errors[0].message);
    if (!pv.success) return toast.error(pv.error.errors[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signup.email,
      password: signup.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { full_name: signup.full_name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message.includes("already") ? "البريد مسجل مسبقاً" : error.message);
    toast.success("تم إنشاء الحساب! تحقق من بريدك");
  };

  return (
    <Layout>
      <div className="mx-auto w-full max-w-md px-4 py-12">
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 rounded-2xl gradient-warm flex items-center justify-center shadow-warm mb-4">
            <Sparkles className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-extrabold">أهلاً بك في طازج</h1>
          <p className="text-muted-foreground text-sm mt-1">سجّل دخولك لتتبع طلباتك</p>
        </div>
        <div className="p-6 gradient-card rounded-2xl border border-border/60 shadow-card">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 mb-6 w-full">
              <TabsTrigger value="signin">تسجيل الدخول</TabsTrigger>
              <TabsTrigger value="signup">حساب جديد</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={handleSignin} className="space-y-4">
                <div><Label>البريد الإلكتروني</Label>
                  <Input type="email" value={signin.email} onChange={(e) => setSignin({ ...signin, email: e.target.value })} required /></div>
                <div><Label>كلمة المرور</Label>
                  <Input type="password" value={signin.password} onChange={(e) => setSignin({ ...signin, password: e.target.value })} required /></div>
                <Button type="submit" disabled={loading} className="w-full gradient-warm border-0 shadow-warm h-11">
                  {loading ? "..." : "دخول"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div><Label>الاسم الكامل</Label>
                  <Input value={signup.full_name} onChange={(e) => setSignup({ ...signup, full_name: e.target.value })} required /></div>
                <div><Label>البريد الإلكتروني</Label>
                  <Input type="email" value={signup.email} onChange={(e) => setSignup({ ...signup, email: e.target.value })} required /></div>
                <div><Label>كلمة المرور</Label>
                  <Input type="password" value={signup.password} onChange={(e) => setSignup({ ...signup, password: e.target.value })} required minLength={6} /></div>
                <Button type="submit" disabled={loading} className="w-full gradient-warm border-0 shadow-warm h-11">
                  {loading ? "..." : "إنشاء حساب"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </Layout>
  );
};
export default Auth;
