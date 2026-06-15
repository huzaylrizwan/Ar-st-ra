import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import { useCategories } from "@/hooks/use-categories";
import { useWishlist } from "@/hooks/use-wishlist";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Menu, ShieldCheck, Instagram, Facebook, MessageCircle, MapPin, ExternalLink, Heart } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Banner } from "@shared/schema";
import { FloatingContactButton } from "@/components/FloatingContactButton";

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { data: settings } = useSettings();
  const { data: categories } = useCategories();
  const { count: wishlistCount } = useWishlist();
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
              <div className="relative">
                <Heart
                  className="w-5 h-5 cursor-pointer transition-colors hover:opacity-80"
                  style={{ color: "var(--text-secondary)" }}
                />
                {wishlistCount > 0 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-[9px] font-bold flex items-center justify-center text-black"
                    style={{ background: "var(--accent)" }}
                  >
                    {wishlistCount}
                  </span>
                )}
              </div>
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

      <footer style={{
        background: "#0a0a0f",
        borderTop: "1px solid rgba(201,169,110,0.2)",
      }}>
        {/* Glow line */}
        <div style={{
          height: "1px",
          background: "linear-gradient(90deg, transparent, var(--text-accent), transparent)",
          opacity: 0.5,
        }} />

        <div className="container mx-auto px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">

            {/* Col 1: Brand */}
            <div className="lg:col-span-1">
              <div className="text-3xl font-light tracking-[0.15em] uppercase mb-4"
                style={{ fontFamily: "var(--font-display)", color: "#fff" }}>
                {settings?.brandName || "LUXE"}
              </div>
              <p className="text-xs leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
                Handcrafted luxury furniture with augmented reality visualisation.
              </p>
              <div className="flex gap-4">
                {settings?.instagramUrl && (
                  <a href={settings.instagramUrl} target="_blank" rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-70" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <Instagram className="w-5 h-5" />
                  </a>
                )}
                {settings?.facebookUrl && (
                  <a href={settings.facebookUrl} target="_blank" rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-70" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <Facebook className="w-5 h-5" />
                  </a>
                )}
                {settings?.whatsappNumber && (
                  <a href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="transition-opacity hover:opacity-70" style={{ color: "rgba(255,255,255,0.5)" }}>
                    <MessageCircle className="w-5 h-5" />
                  </a>
                )}
              </div>
            </div>

            {/* Col 2: Quick Links */}
            <div>
              <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
                Quick Links
              </div>
              <div className="flex flex-col gap-3">
                {[
                  { href: "/", label: "Home" },
                  { href: "/categories", label: "Collections" },
                  { href: "/faq", label: "FAQ" },
                  { href: "/contact", label: "Contact" },
                ].map(({ href, label }) => (
                  <Link key={href} href={href}
                    className="text-sm transition-colors hover:opacity-100"
                    style={{ color: "rgba(255,255,255,0.45)" }}>
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Col 3: Collections (dynamic from DB) */}
            <div>
              <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
                Collections
              </div>
              <div className="flex flex-col gap-3">
                {categories?.filter(c => !c.isHidden).slice(0, 6).map(cat => (
                  <Link key={cat.id} href={`/categories?filter=${cat.slug}`}
                    className="text-sm transition-colors hover:opacity-100"
                    style={{ color: "rgba(255,255,255,0.45)" }}>
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>

            {/* Col 4: Contact */}
            <div>
              <div className="text-xs uppercase tracking-[0.2em] mb-6" style={{ color: "rgba(255,255,255,0.3)" }}>
                Contact
              </div>
              <div className="flex flex-col gap-4">
                {settings?.whatsappNumber && (
                  <a href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 text-sm transition-opacity hover:opacity-80"
                    style={{ color: "rgba(255,255,255,0.45)" }}>
                    <MessageCircle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#c9a96e" }} />
                    {settings.whatsappNumber}
                  </a>
                )}
                {settings?.contactEmail && (
                  <a href={`mailto:${settings.contactEmail}`}
                    className="flex items-start gap-3 text-sm transition-opacity hover:opacity-80"
                    style={{ color: "rgba(255,255,255,0.45)" }}>
                    <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#c9a96e" }} />
                    {settings.contactEmail}
                  </a>
                )}
                {settings?.address && (
                  <div className="flex items-start gap-3 text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>
                    <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#c9a96e" }} />
                    <span className="leading-relaxed">{settings.address}</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Copyright bar */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="container mx-auto px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-2">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
              © {new Date().getFullYear()} {settings?.brandName || "Luxury Furniture"}. All rights reserved.
            </p>
            <div className="flex gap-4">
              {settings?.privacyPolicyUrl && (
                <a href={settings.privacyPolicyUrl} className="text-xs transition-opacity hover:opacity-70"
                  style={{ color: "rgba(255,255,255,0.25)" }}>Privacy Policy</a>
              )}
              {settings?.termsUrl && (
                <a href={settings.termsUrl} className="text-xs transition-opacity hover:opacity-70"
                  style={{ color: "rgba(255,255,255,0.25)" }}>Terms</a>
              )}
            </div>
          </div>
        </div>
      </footer>

      <FloatingContactButton />
    </div>
  );
}
