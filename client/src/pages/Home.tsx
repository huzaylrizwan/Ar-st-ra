import { Layout } from "@/components/Layout";
import { useCategories } from "@/hooks/use-categories";
import { useProducts } from "@/hooks/use-products";
import { useSettings } from "@/hooks/use-settings";
import { ProductCard, ProductCardSkeleton } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Box, MessageCircle } from "lucide-react";
import { RevealOnScroll } from "@/components/RevealOnScroll";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import type { Category, HeroImage, ThemeSettings } from "@shared/schema";

// Magazine Category Grid Component
function MagazineCategoryGrid({ categories }: { categories: Category[] }) {
  const visible = categories.filter(c => !c.isHidden).slice(0, 5);
  if (visible.length === 0) return null;

  return (
    <RevealOnScroll>
      <section className="py-16 sm:py-24 container mx-auto px-4 sm:px-6">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] mb-3" style={{ color: "var(--accent)", fontFamily: "var(--font-sans)" }}>
              Our Collections
            </p>
            <h2 className="font-medium" style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(24px, 3vw, 40px)", color: "var(--text-primary)" }}>
              Curated for Every Space
            </h2>
          </div>
          <Link href="/categories" className="text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
            style={{ color: "var(--accent)", fontFamily: "var(--font-sans)" }}>
            View All →
          </Link>
        </div>

        {/* Magazine grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 auto-rows-[200px] md:auto-rows-[240px]">
          {visible.map((cat, i) => (
            <Link key={cat.id} href={`/categories?id=${cat.id}`}
              className={`group relative overflow-hidden block ${i === 0 ? "row-span-2" : ""} ${i === 3 ? "md:col-span-2" : ""}`}
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <img
                src={cat.imageUrl}
                alt={cat.name}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              {/* Glass label */}
              <div className="absolute bottom-0 left-0 right-0 p-4 glass"
                style={{ borderRadius: "0 0 var(--radius-card) var(--radius-card)" }}>
                <h3 className="font-medium text-sm" style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}>
                  {cat.name}
                </h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </RevealOnScroll>
  );
}

function HeroSection({ heroImages, settings }: { heroImages: HeroImage[], settings?: ThemeSettings }) {
  const activeImages = heroImages.filter(img => img.isActive);
  const [currentIndex, setCurrentIndex] = useState(0);
  const interval = settings?.heroSlideInterval ?? 5;

  useEffect(() => {
    if (activeImages.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentIndex(i => (i + 1) % activeImages.length);
    }, interval * 1000);
    return () => clearInterval(timer);
  }, [activeImages.length, interval]);

  const bgImage = activeImages[currentIndex]?.url
    || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1800&q=80";

  return (
    <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
      {/* Background image with transition */}
      <AnimatePresence mode="wait">
        <motion.div
          key={bgImage}
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${bgImage})` }}
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        />
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 40%, rgba(0,0,0,0.65) 100%)"
      }} />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-3xl mx-auto">
        <motion.p
          className="text-xs uppercase tracking-[0.35em] mb-6"
          style={{ color: "var(--accent)", fontFamily: "var(--font-sans)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.7 }}
        >
          {settings?.brandName || "Luxury Furniture"} · Pakistan
        </motion.p>

        <motion.h1
          className="font-light leading-[1.1] mb-6"
          style={{
            fontFamily: "var(--font-display)",
            color: "#fff",
            fontSize: "clamp(40px, 6vw, 80px)",
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.8 }}
        >
          Where Space<br />Becomes Art
        </motion.h1>

        <motion.p
          className="text-base mb-10 max-w-md mx-auto"
          style={{ color: "rgba(255,255,255,0.65)", fontFamily: "var(--font-sans)" }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
        >
          Handcrafted luxury furniture with augmented reality visualisation
        </motion.p>

        <motion.div
          className="flex items-center justify-center gap-4 flex-wrap"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9, duration: 0.6 }}
        >
          <Link href="/categories">
            <button className="px-8 py-3 text-xs uppercase tracking-widest font-medium transition-all duration-200 hover:opacity-90"
              style={{
                background: "var(--accent)",
                color: "#000",
                borderRadius: "var(--radius-pill)",
                fontFamily: "var(--font-sans)",
              }}>
              Explore Collection
            </button>
          </Link>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        aria-hidden="true"
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
      >
        <div className="w-px h-12 mx-auto" style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.5))" }} />
      </motion.div>
    </section>
  );
}

export default function Home() {
  const { data: categories } = useCategories();
  const { data: featuredProducts, isLoading: isLoadingProducts } = useProducts();
  const { data: settings } = useSettings();
  const [showARTutorial, setShowARTutorial] = useState(false);

  const { data: activeHeroImages } = useQuery<HeroImage[]>({
    queryKey: ["/api/hero-images/active-all"],
    queryFn: async () => {
      const res = await fetch("/api/hero-images/active-all", { credentials: "include" });
      if (!res.ok) return [];
      return res.json();
    },
  });


  const showCollections = settings?.showCollections !== false;
  const showNewArrivals = settings?.showNewArrivals !== false;
  const showPhilosophy = settings?.showPhilosophy !== false;
  const showARSection = settings?.showARSection !== false;

  const visibleProducts = (featuredProducts ?? []).filter(p => !p.isHidden);

  const ARTutorial = () => (
    <Dialog open={showARTutorial} onOpenChange={setShowARTutorial}>
      <DialogContent className="sm:max-w-md border-none bg-background/95 backdrop-blur-lg shadow-2xl">
        <DialogHeader>
          <DialogTitle className="font-serif text-2xl text-center">Experience Luxury in AR</DialogTitle>
        </DialogHeader>
        <div className="space-y-8 py-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="font-bold text-primary italic">01</span>
            </div>
            <div className="space-y-1">
              <p className="font-medium">Discover Your Piece</p>
              <p className="text-sm text-muted-foreground">Select any piece from our curated collection to view its details.</p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
              <Box className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">View in Reality</p>
              <p className="text-sm text-muted-foreground">On the product page, simply tap the gold <strong className="text-foreground">View in Reality</strong> button to see it in your space.</p>
            </div>
          </div>
          
          <div className="pt-4">
            <Link href="/categories">
              <Button className="w-full h-12 text-xs tracking-widest uppercase font-bold rounded-none shadow-lg shadow-primary/20" onClick={() => setShowARTutorial(false)}>
                Start Browsing
              </Button>
            </Link>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  return (
    <Layout>
      <ARTutorial />
      <HeroSection heroImages={activeHeroImages ?? []} settings={settings} />

      {/* Featured Categories - Magazine Grid */}
      {showCollections && (
        <MagazineCategoryGrid categories={categories ?? []} />
      )}

      {/* New Arrivals horizontal strip */}
      {(isLoadingProducts || visibleProducts.length > 0) && showNewArrivals && (
        <RevealOnScroll>
          <section className="py-16 sm:py-20">
            <div className="container mx-auto px-4 sm:px-6 mb-8">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.25em] mb-3" style={{ color: "var(--accent)", fontFamily: "var(--font-sans)" }}>Fresh In</p>
                  <h2 className="font-medium" style={{ fontFamily: "var(--font-serif)", fontSize: "clamp(22px, 2.5vw, 36px)", color: "var(--text-primary)" }}>
                    New Arrivals
                  </h2>
                </div>
                <Link href="/categories" className="text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
                  style={{ color: "var(--accent)" }}>
                  View All →
                </Link>
              </div>
            </div>
            <div className="flex gap-5 overflow-x-auto scrollbar-hide px-4 sm:px-6 pb-4">
              {isLoadingProducts ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-[240px] sm:w-[280px]">
                    <ProductCardSkeleton featured />
                  </div>
                ))
              ) : (
                visibleProducts.slice(0, 8).map(product => (
                  <div key={product.id} className="flex-shrink-0 w-[240px] sm:w-[280px]">
                    <ProductCard product={product} featured />
                  </div>
                ))
              )}
            </div>
          </section>
        </RevealOnScroll>
      )}

      {/* Philosophy / About Block */}
      {showPhilosophy && (
        <RevealOnScroll>
          <section className="py-20 sm:py-28 px-6">
            <div
              className="max-w-4xl mx-auto text-center py-20 px-8 glass"
              style={{ borderRadius: "var(--radius-modal)" }}
            >
              <p className="text-xs uppercase tracking-[0.3em] mb-6" style={{ color: "var(--accent)", fontFamily: "var(--font-sans)" }}>
                Our Philosophy
              </p>
              <h2 className="font-light leading-tight mb-6"
                style={{ fontFamily: "var(--font-display)", fontSize: "clamp(28px, 4vw, 52px)", color: "var(--text-primary)" }}>
                Where craftsmanship<br />meets living
              </h2>
              <p className="text-base leading-relaxed max-w-xl mx-auto"
                style={{ color: "var(--text-secondary)", fontFamily: "var(--font-sans)" }}>
                Every piece in our collection is handpicked for quality, beauty, and lasting value.
              </p>
            </div>
          </section>
        </RevealOnScroll>
      )}

      {/* WhatsApp CTA Strip */}
      {settings?.whatsappNumber && (
        <RevealOnScroll>
          <section className="py-16 px-6">
            <div
              className="max-w-2xl mx-auto text-center py-12 px-8"
              style={{
                background: "var(--accent-glow)",
                border: "1px solid var(--accent)",
                borderRadius: "var(--radius-modal)",
              }}
            >
              <h3 className="font-medium text-xl mb-3"
                style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}>
                Ready to transform your space?
              </h3>
              <p className="text-sm mb-6" style={{ color: "var(--text-secondary)" }}>
                Speak with our team on WhatsApp — we'll help you find the perfect piece.
              </p>
              <a
                href={`https://wa.me/${settings.whatsappNumber.replace(/\D/g, "")}?text=Hi, I'd like to enquire about your furniture collection.`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-8 py-3 text-xs uppercase tracking-widest font-medium transition-all duration-200 hover:opacity-90"
                style={{
                  background: "var(--accent)",
                  color: "#000",
                  borderRadius: "var(--radius-pill)",
                  fontFamily: "var(--font-sans)",
                }}
              >
                <MessageCircle className="w-4 h-4" />
                Chat on WhatsApp
              </a>
            </div>
          </section>
        </RevealOnScroll>
      )}

      {/* AR Feature Teaser - Compact on mobile */}
      {showARSection && (
      <section className="py-12 sm:py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="container mx-auto px-5 sm:px-4 relative z-10 text-center max-w-3xl">
          <h2 className="font-serif text-2xl sm:text-3xl md:text-5xl mb-4 sm:mb-6 font-medium">Experience It In Your Home</h2>
          <p className="text-sm sm:text-lg opacity-90 mb-6 sm:mb-10 leading-relaxed font-light">
            Visualize furniture in your space using AR. No app required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-primary rounded-full sm:rounded-none px-8 sm:px-12 py-5 sm:py-7 font-bold tracking-widest uppercase text-xs sm:text-sm shadow-2xl"
              onClick={() => setShowARTutorial(true)}
            >
              Browse with AR
            </Button>
          </div>
        </div>
      </section>
      )}
    </Layout>
  );
}

