import { Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useSiteContent } from "@/lib/siteContent";

export const Footer = () => {
  const { content } = useSiteContent();
  return (
    <footer className="border-t border-border/50 mt-20 bg-secondary/30">
      <div className="container py-10 grid gap-8 md:grid-cols-3">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-warm">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-extrabold text-gradient">{content.site_name}</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{content.footer_description}</p>
        </div>
        <div>
          <h4 className="font-bold mb-3">روابط سريعة</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {content.footer_links.map((l, i) => (
              <li key={i}><Link to={l.url} className="hover:text-primary transition-smooth">{l.label}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h4 className="font-bold mb-3">تواصل معنا</h4>
          <p className="text-sm text-muted-foreground whitespace-pre-line">{content.footer_contact}</p>
        </div>
      </div>
      <div className="border-t border-border/50 py-4 text-center text-xs text-muted-foreground">
        {content.footer_copyright}
      </div>
    </footer>
  );
};
