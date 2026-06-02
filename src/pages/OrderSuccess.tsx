import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Package, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Layout } from "@/components/Layout";

const OrderSuccess = () => {
  const { id } = useParams();
  return (
    <Layout>
      <div className="container py-20 text-center max-w-lg mx-auto space-y-6 animate-fade-up">
        <div className="mx-auto w-24 h-24 rounded-full gradient-warm flex items-center justify-center shadow-warm animate-scale-in">
          <CheckCircle2 className="h-12 w-12 text-primary-foreground" />
        </div>
        <h1 className="text-3xl md:text-4xl font-extrabold">تم استلام طلبك!</h1>
        <p className="text-muted-foreground text-lg">سنتواصل معك قريباً لتأكيد التوصيل</p>
        {id && (
          <div className="p-4 bg-secondary rounded-xl inline-block">
            <p className="text-xs text-muted-foreground">رقم الطلب</p>
            <p className="font-mono font-bold">{id.slice(0, 8).toUpperCase()}</p>
          </div>
        )}
        <div className="flex flex-wrap gap-3 justify-center">
          <Button asChild className="gradient-warm border-0"><Link to="/orders"><Package className="ml-2 h-4 w-4" />طلباتي</Link></Button>
          <Button asChild variant="outline"><Link to="/"><Home className="ml-2 h-4 w-4" />الرئيسية</Link></Button>
        </div>
      </div>
    </Layout>
  );
};
export default OrderSuccess;
