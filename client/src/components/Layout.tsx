import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useCategories } from "@/hooks/use-categories";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Menu, ShieldCheck, Instagram, Facebook, MessageCircle, MapPin, ExternalLink } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Banner } from "@shared/schema";
import { FloatingContactButton } from "@/components/FloatingContactButton";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { data: settings } = useSettings();
  const { data: categories } = useCategories();
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const { data: banners, isLoading: bannersLoading } = useQuery<Banner[]>({
    queryKey: ["/api/banners/active"],
  });

  const randomBanner = useMemo(() => {
    if (!banners || banners.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * banners.length);
    return banners[randomIndex];
  }, [banners]);

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => {
    const isActive = location === href;
    return (
      <Link href={href} className={`
        text-xs uppercase tracking-widest font-medium transition-colors duration-200
        ${isActive ? "text-[var(--text-accent)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}
        py-2
      `}>
        {children}
      </Link>
    );
  };

  const getBannerText = () => {
    if (bannersLoading) return "...";
    if (randomBanner) return randomBanner.text;
    return "Welcome to our luxury furniture collection";
  };

  return (
    <div className="min-h-screen flex flex-col font-sans bg-background text-foreground overflow-x-hidden">
      {/* Promo Bar */}
      {settings?.showBanner !== false && banners && banners.length > 0 && (
        <div
          className="overflow-hidden py-2 text-center text-xs tracking-widest uppercase font-semibold"
          style={{ background: "var(--text-accent)", color: "#000" }}
          data-testid="banner-promo"
        >
          <div className="marquee-track">
            {[...banners, ...banners].map((banner, i) => (
              <span key={i} className="px-8 whitespace-nowrap">
                {banner.text} <span className="opacity-50 mx-4">·</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        scrolled
          ? "glass border-b border-[var(--glass-border)]"
          : "bg-transparent border-b border-transparent"
      }`}>
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            
            {/* Mobile Menu Trigger */}
            <div className="md:hidden">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="-ml-2" data-testid="button-mobile-menu">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[85vw] max-w-[300px] sm:max-w-[400px]">
                  <div className="flex flex-col gap-8 mt-10">
                    <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-2xl font-serif font-bold">
                      {settings?.brandName || "LUXE"}
                    </Link>
                    <nav className="flex flex-col gap-4">
                      <Link href="/" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium" data-testid="link-mobile-home">Home</Link>
                      <Link href="/categories" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium" data-testid="link-mobile-collections">Collections</Link>
                      <Link href="/faq" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium" data-testid="link-mobile-faq">FAQ</Link>
                      <Link href="/contact" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium" data-testid="link-mobile-contact">Contact</Link>
                      {user && (
                        <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-medium text-primary" data-testid="link-mobile-admin">
                          Admin Dashboard
                        </Link>
                      )}
                    </nav>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Logo */}
            <div className="flex-1 flex items-center justify-center md:justify-start md:flex-none overflow-hidden">
              <Link href="/" className="group flex items-center gap-2" data-testid="link-home-logo">
                {settings?.logoUrl && <img src={settings.logoUrl} alt="Logo" className="h-6 sm:h-8 w-auto object-contain flex-shrink-0" />}
                <span className="text-xl tracking-[0.12em] uppercase font-light transition-colors truncate"
                  style={{ fontFamily: "var(--font-display)", color: "var(--text-primary)" }}>
                  {settings?.brandName || "LUXE"}
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <nav className="hidden md:flex gap-8 items-center">
              <NavLink href="/">Home</NavLink>
              <NavLink href="/categories">Collections</NavLink>
              {user && <NavLink href="/admin">Admin</NavLink>}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
              {settings?.whatsappNumber && (
                <a
                  href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden md:flex items-center gap-2 px-4 py-2 text-xs uppercase tracking-widest transition-all duration-200 hover:opacity-80"
                  style={{
                    background: "var(--accent-glow)",
                    border: "1px solid var(--text-accent)",
                    borderRadius: "var(--radius-pill)",
                    color: "var(--text-accent)",
                    fontFamily: "var(--font-sans)",
                  }}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {settings.whatsappNumber}
                </a>
              )}
              {user ? (
                <Button variant="ghost" size="sm" onClick={() => logout()} className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground px-2 sm:px-3" data-testid="button-logout">
                  Logout
                </Button>
              ) : (
                <Link href="/login" className="hidden md:block">
                  <Button variant="ghost" size="sm" className="text-xs uppercase tracking-wider" data-testid="button-sign-in">
                    Sign In
                  </Button>
                </Link>
              )}
              {user && (
                <Link href="/admin" className="md:hidden" data-testid="link-admin-mobile">
                  <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <AnimatePresence mode="wait">
          <motion.div
            key={location}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="bg-muted/30 pt-10 md:pt-16 pb-6 md:pb-8 border-t border-border">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-8 md:mb-12">
            {/* Brand Column */}
            <div>
              <h3 className="font-serif text-xl font-bold mb-4">{settings?.brandName || "LUXE"}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mb-4">
                Crafting exceptional living spaces with timeless furniture pieces designed for the modern connoisseur.
              </p>
              
              {/* Social Media Links */}
              {(settings?.instagramUrl || settings?.facebookUrl || settings?.whatsappNumber) && (
                <div className="flex gap-3 mt-4">
                  {settings?.instagramUrl && (
                    <a 
                      href={settings.instagramUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-2 bg-muted rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                      data-testid="link-social-instagram"
                    >
                      <Instagram className="w-4 h-4" />
                    </a>
                  )}
                  {settings?.facebookUrl && (
                    <a 
                      href={settings.facebookUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-2 bg-muted rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                      data-testid="link-social-facebook"
                    >
                      <Facebook className="w-4 h-4" />
                    </a>
                  )}
                  {settings?.whatsappNumber && (
                    <a 
                      href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, '')}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="p-2 bg-muted rounded-full hover:bg-primary hover:text-primary-foreground transition-colors"
                      data-testid="link-social-whatsapp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Collections - Dynamic */}
            <div className="hidden md:block">
              <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Collections</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {(categories?.filter(c => !c.isHidden).slice(0, 5) ?? []).map(cat => (
                  <li key={cat.id}>
                    <Link href={`/categories?id=${cat.id}`} className="hover:text-primary transition-colors">
                      {cat.name}
                    </Link>
                  </li>
                ))}
                {(!categories || categories.filter(c => !c.isHidden).length === 0) && (
                  <li><Link href="/categories" className="hover:text-primary transition-colors">View All</Link></li>
                )}
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><Link href="/contact" className="hover:text-primary transition-colors" data-testid="link-footer-contact">Contact Us</Link></li>
                <li><Link href="/faq" className="hover:text-primary transition-colors" data-testid="link-footer-faq">FAQ</Link></li>
              </ul>
            </div>

            {/* Location / Address */}
            <div>
              {settings?.address && (
                <>
                  <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Visit Us</h4>
                  <div className="flex items-start gap-2 text-sm text-muted-foreground mb-3">
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <p className="leading-relaxed">{settings.address}</p>
                  </div>
                  {settings?.mapEmbedUrl && (
                    <a 
                      href={settings.mapEmbedUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                      data-testid="link-footer-map"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View on Google Maps
                    </a>
                  )}
                </>
              )}
              
              {!settings?.address && (
                <>
                  <h4 className="text-sm font-bold uppercase tracking-widest mb-4">Newsletter</h4>
                  <p className="text-xs text-muted-foreground mb-4">Subscribe to receive exclusive offers and design inspiration.</p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const emailInput = e.currentTarget.elements.namedItem("newsletter-email") as HTMLInputElement;
                      const email = emailInput?.value;
                      if (!email) return;
                      if (settings?.whatsappNumber) {
                        window.open(`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}?text=Newsletter+subscription:+${encodeURIComponent(email)}`, "_blank");
                      } else if (settings?.contactEmail) {
                        window.open(`mailto:${settings.contactEmail}?subject=Newsletter+Subscription&body=Email:+${encodeURIComponent(email)}`, "_blank");
                      }
                    }}
                    className="flex gap-2"
                  >
                    <input
                      name="newsletter-email"
                      type="email"
                      placeholder="Email Address"
                      className="bg-background border border-input rounded-sm px-3 py-2 text-sm w-full focus:outline-none focus:ring-1 focus:ring-primary"
                      data-testid="input-newsletter-email"
                    />
                    <Button type="submit" variant="default" size="sm" className="rounded-sm" data-testid="button-newsletter-join">Join</Button>
                  </form>
                </>
              )}
            </div>
          </div>

          {/* Attribution - Prominent */}
          <div className="py-4 mb-4 border-t border-b border-border/50 text-center">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">AR Experience</span> powered by{" "}
              <a 
                href="https://growyoursmedia.com" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline font-semibold"
                data-testid="link-attribution"
              >
                GrowYourMedia
              </a>
            </p>
          </div>

          {/* Copyright */}
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} {settings?.brandName || "Luxury Furniture"}. All rights reserved.</p>
            <div className="flex gap-6">
              {settings?.privacyPolicyUrl && (
                <a href={settings.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground" data-testid="link-privacy">
                  Privacy Policy
                </a>
              )}
              {settings?.termsUrl && (
                <a href={settings.termsUrl} target="_blank" rel="noopener noreferrer" className="hover:text-foreground" data-testid="link-terms">
                  Terms of Service
                </a>
              )}
            </div>
          </div>
        </div>
      </footer>

      <FloatingContactButton />
    </div>
  );
}
