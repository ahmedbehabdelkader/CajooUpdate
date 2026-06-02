import cashew from "@/assets/product-cashew.jpg";
import pistachio from "@/assets/product-pistachio.jpg";
import almonds from "@/assets/product-almonds.jpg";
import hazelnuts from "@/assets/product-hazelnuts.jpg";
import mixed from "@/assets/product-mixed.jpg";
import walnuts from "@/assets/product-walnuts.jpg";
import raisins from "@/assets/product-raisins.jpg";

const map: Record<string, string> = {
  "/src/assets/product-cashew.jpg": cashew,
  "/src/assets/product-pistachio.jpg": pistachio,
  "/src/assets/product-almonds.jpg": almonds,
  "/src/assets/product-hazelnuts.jpg": hazelnuts,
  "/src/assets/product-mixed.jpg": mixed,
  "/src/assets/product-walnuts.jpg": walnuts,
  "/src/assets/product-raisins.jpg": raisins,
};

export const resolveImage = (url: string | null | undefined): string => {
  if (!url) return cashew;
  return map[url] || url;
};
