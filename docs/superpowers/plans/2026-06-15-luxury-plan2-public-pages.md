# Luxury Redesign — Plan 2: Public Pages

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Prerequisite:** Plan 1 (Foundation) must be complete. CSS variables, glass classes, RevealOnScroll, and ThemeProvider must exist.

**Goal:** Rebuild every visitor-facing page to international luxury brand standard — homepage hero, magazine category grid, product cards with wishlist, masonry collections grid, glass filters.

**Architecture:** All pages use `var(--*)` CSS tokens from Plan 1. `RevealOnScroll` wraps every section. `ProductCard` is upgraded in-place — all existing uses automatically get the new look. Wishlist is localStorage-only with a custom hook.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, framer-motion, shadcn/ui, TanStack Query, embla-carousel-react

**Spec:** `docs/superpowers/specs/2026-06-15-luxury-redesign-design.md` — Parts 3, 4.7, 5

---

## Task 1: WishlistButton Hook + Component

**Files:**
- Create: `client/src/hooks/use-wishlist.ts`
- Create: `client/src/components/WishlistButton.tsx`

- [ ] **Step 1: Create use-wishlist.ts**

Create `client/src/hooks/use-wishlist.ts`:

```typescript
import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "wishlist_product_ids";

function readWishlist(): number[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useWishlist() {
  const [ids, setIds] = useState<number[]>(readWishlist);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }, [ids]);

  const toggle = useCallback((productId: number) => {
    setIds(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const isWishlisted = useCallback(
    (productId: number) => ids.includes(productId),
    [ids]
  );

  return { ids, toggle, isWishlisted, count: ids.length };
}
```

- [ ] **Step 2: Create WishlistButton.tsx**

Create `client/src/components/WishlistButton.tsx`:

```typescript
import { Heart } from "lucide-react";
import { useWishlist } from "@/hooks/use-wishlist";
import { cn } from "@/lib/utils";

interface WishlistButtonProps {
  productId: number;
  className?: string;
}

export function WishlistButton({ productId, className }: WishlistButtonProps) {
  const { toggle, isWishlisted } = useWishlist();
  const active = isWishlisted(productId);

  return (
    <button
      type="button"
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle(productId);
      }}
      className={cn(
        "w-8 h-8 flex items-center justify-center rounded-full transition-all duration-200",
        "glass hover:scale-110 active:scale-95",
        className
      )}
    >
      <Heart
        className="w-4 h-4 transition-colors duration-200"
        style={{
          color: active ? "#e11d48" : "var(--text-secondary)",
          fill: active ? "#e11d48" : "none",
        }}
      />
    </button>
  );
}
```

- [ ] **Step 3: Add wishlist count badge to navbar**

Open `client/src/components/Layout.tsx`. Import `useWishlist` and `Heart` from lucide-react. Add wishlist badge to the right side of the navbar (between WhatsApp CTA and admin link):

```typescript
import { useWishlist } from "@/hooks/use-wishlist";
// inside Layout component:
const { count: wishlistCount } = useWishlist();

// In the navbar right side JSX:
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
```

- [ ] **Step 4: TypeScript check**

```bash
npm run check
```

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/use-wishlist.ts client/src/components/WishlistButton.tsx client/src/components/Layout.tsx
git commit -m "feat: wishlist — localStorage hook, heart button component, navbar badge count"
```

---

## Task 2: ProductCard — Luxury Upgrade

**Files:**
- Modify: `client/src/components/ProductCard.tsx`

- [ ] **Step 1: Rewrite ProductCard.tsx**

Replace the entire file content:

```typescript
import { Link } from "wouter";
import { type Product } from "@shared/schema";
import { motion } from "framer-motion";
import { Box } from "lucide-react";
import { useSettings } from "@/hooks/use-settings";
import { WishlistButton } from "@/components/WishlistButton";

interface ProductCardProps {
  product: Product;
  featured?: boolean; // taller card in masonry grid
}

export function ProductCard({ product, featured = false }: ProductCardProps) {
  const { data: settings } = useSettings();
  const currencySymbol = settings?.currencySymbol ?? "PKR";
  const mainImage = product.images?.[0] || "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80";

  const hasModel = false; // will be enhanced in Plan 3 with productModels check

  return (
    <Link href={`/products/${product.id}`} className="block group" data-testid={`product-card-${product.id}`}>
      <motion.div
        className="relative overflow-hidden"
        style={{
          borderRadius: "var(--radius-card)",
          background: "var(--surface-1)",
          boxShadow: "var(--shadow-card)",
          aspectRatio: featured ? "3/4" : "1/1",
        }}
        whileHover={{
          y: -6,
          boxShadow: "var(--shadow-glow)",
          transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
        }}
      >
        {/* Image */}
        <img
          src={mainImage}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          style={{ position: "absolute", inset: 0 }}
        />

        {/* Top badges */}
        <div className="absolute top-3 left-3 flex gap-2 z-10">
          {product.stockStatus === "out_of_stock" && (
            <span className="text-[9px] uppercase tracking-wider px-2.5 py-1 font-semibold"
              style={{ background: "rgba(239,68,68,0.9)", color: "#fff", borderRadius: "var(--radius-pill)" }}>
              Unavailable
            </span>
          )}
          {product.stockStatus === "made_to_order" && (
            <span className="text-[9px] uppercase tracking-wider px-2.5 py-1 font-semibold"
              style={{ background: "rgba(245,158,11,0.9)", color: "#fff", borderRadius: "var(--radius-pill)" }}>
              Made to Order
            </span>
          )}
          {hasModel && (
            <span className="text-[9px] uppercase tracking-wider px-2.5 py-1 font-semibold flex items-center gap-1"
              style={{ background: "rgba(120,100,255,0.85)", color: "#fff", borderRadius: "var(--radius-pill)" }}>
              <Box className="w-2.5 h-2.5" /> AR
            </span>
          )}
        </div>

        {/* Wishlist button */}
        <div className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <WishlistButton productId={product.id} />
        </div>

        {/* Glass info strip at bottom */}
        <div
          className="absolute bottom-0 left-0 right-0 p-4 glass"
          style={{ borderRadius: "0 0 var(--radius-card) var(--radius-card)" }}
        >
          <h3 className="font-semibold text-sm leading-tight line-clamp-1 mb-0.5"
            style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}>
            {product.name}
          </h3>
          <p className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
            {currencySymbol} {Math.round(product.price / 100).toLocaleString()}
          </p>
        </div>
      </motion.div>
    </Link>
  );
}
```

- [ ] **Step 2: TypeScript check**

```bash
npm run check
```

Expected: 0 errors.

- [ ] **Step 3: Verify cards render**

```bash
npm run dev
```

Visit `http://localhost:5000`. Product cards should show glass info strip, hover lifts. Wishlist heart appears on hover.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ProductCard.tsx
git commit -m "feat: ProductCard luxury redesign — glass info strip, hover lift+glow, wishlist button, AR badge"
```

---

## Task 3: Homepage — Full-Bleed Hero

**Files:**
- Modify: `client/src/pages/Home.tsx`

- [ ] **Step 1: Replace the hero section in Home.tsx**

Open `client/src/pages/Home.tsx`. Find the hero section (the part that renders `HeroSection` or the first big section). Replace it with a new `HeroSection` component defined at the top of the file:

```typescript
function HeroSection({ heroImages, settings }: { heroImages: HeroImage[], settings: any }) {
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
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 8, 0] }}
        transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
      >
        <div className="w-px h-12 mx-auto" style={{ background: "linear-gradient(to bottom, transparent, rgba(255,255,255,0.5))" }} />
      </motion.div>
    </section>
  );
}
```

Use `<HeroSection heroImages={heroImages} settings={settings} />` in the page return.

- [ ] **Step 2: Fetch heroImages in the page**

In `Home.tsx`, add the query for active hero images if not already present:

```typescript
const { data: heroImages = [] } = useQuery<HeroImage[]>({
  queryKey: ["/api/hero-images/active"],
});
```

- [ ] **Step 3: Verify hero renders full-screen**

```bash
npm run dev
```

Homepage should show full-screen hero with animated headline, gradient overlay, scroll indicator.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Home.tsx
git commit -m "feat: homepage hero — full-screen with slideshow, Cormorant headline, animated entrance"
```

---

## Task 4: Homepage — Magazine Category Grid

**Files:**
- Modify: `client/src/pages/Home.tsx`

- [ ] **Step 1: Replace CategoriesCarousel with MagazineGrid**

In `Home.tsx`, remove the `CategoriesCarousel` component and Embla imports for the carousel. Replace with:

```typescript
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
            <Link key={cat.id} href={`/categories?filter=${cat.slug}`}
              className={`group relative overflow-hidden block ${i === 0 ? "row-span-2" : ""} ${i === 3 ? "md:col-span-2" : ""}`}
              style={{ borderRadius: "var(--radius-card)" }}
            >
              <img
                src={cat.imageUrl}
                alt={cat.name}
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
```

Import `RevealOnScroll` at the top of `Home.tsx`:
```typescript
import { RevealOnScroll } from "@/components/RevealOnScroll";
```

- [ ] **Step 2: Use MagazineCategoryGrid in page return**

Replace `<CategoriesCarousel ... />` with `<MagazineCategoryGrid categories={categories ?? []} />`.

- [ ] **Step 3: Verify**

```bash
npm run dev
```

Categories section should show magazine-style grid with varying heights. First category card is taller.

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/Home.tsx
git commit -m "feat: homepage categories — magazine grid with featured large card + glass labels"
```

---

## Task 5: Homepage — Products Strip, Philosophy, WhatsApp CTA

**Files:**
- Modify: `client/src/pages/Home.tsx`

- [ ] **Step 1: Add horizontal products strip section**

After the category grid section in the page return, add:

```typescript
{/* New Arrivals horizontal strip */}
{products && products.filter(p => !p.isHidden).length > 0 && settings?.showNewArrivals && (
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
        {products.filter(p => !p.isHidden).slice(0, 8).map(product => (
          <div key={product.id} className="flex-shrink-0 w-[240px] sm:w-[280px]">
            <ProductCard product={product} featured />
          </div>
        ))}
      </div>
    </section>
  </RevealOnScroll>
)}
```

- [ ] **Step 2: Add Philosophy section**

After the products strip:

```typescript
{settings?.showPhilosophy && (
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
```

- [ ] **Step 3: Add WhatsApp CTA strip**

After philosophy, before the closing of the page:

```typescript
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
```

Import `MessageCircle` from lucide-react if not already present.

- [ ] **Step 4: Verify all sections render**

```bash
npm run dev
```

Homepage should now show: Hero → Category Grid → New Arrivals strip → Philosophy → WhatsApp CTA → Footer.

- [ ] **Step 5: TypeScript check**

```bash
npm run check
```

- [ ] **Step 6: Commit**

```bash
git add client/src/pages/Home.tsx
git commit -m "feat: homepage — new arrivals strip, philosophy section, WhatsApp CTA with pre-filled message"
```

---

## Task 6: Collections Page — Masonry Grid + Glass Filters

**Files:**
- Modify: `client/src/pages/Collections.tsx` (check actual filename — may be `client/src/pages/Categories.tsx` or similar)

- [ ] **Step 1: Find the collections/categories listing page**

```bash
ls client/src/pages/
```

Find the file that shows the product listing grid. It may be `Categories.tsx`, `Collections.tsx`, or similar.

- [ ] **Step 2: Upgrade the filter bar to glass style**

Find the search input and category filter tabs. Wrap them in a sticky glass bar:

```typescript
<div className="sticky top-16 z-40 py-4 glass mb-8"
  style={{ borderBottom: "1px solid var(--glass-border)" }}>
  <div className="container mx-auto px-4 sm:px-6 flex flex-col sm:flex-row gap-3">
    {/* Keep existing search input but restyle */}
    <input
      value={search}
      onChange={e => setSearch(e.target.value)}
      placeholder="Search furniture..."
      className="flex-1 px-4 py-2 text-sm outline-none"
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--glass-border)",
        borderRadius: "var(--radius-input)",
        color: "var(--text-primary)",
      }}
    />
    {/* Keep existing category filter pills but restyle */}
    <div className="flex gap-2 overflow-x-auto scrollbar-hide">
      {/* existing category filter pill buttons, restyled: */}
      {/* active pill: background var(--accent), color #000 */}
      {/* inactive pill: background var(--surface-1), color var(--text-secondary) */}
    </div>
  </div>
</div>
```

- [ ] **Step 3: Implement masonry grid**

Replace the product grid with a masonry-style layout:

```typescript
<div className="container mx-auto px-4 sm:px-6">
  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
    {filteredProducts.map((product, i) => (
      <div
        key={product.id}
        className={
          i % 7 === 0 ? "row-span-2" :           // every 7th: tall
          i % 7 === 3 ? "md:col-span-2" : ""     // every 7th+3: wide
        }
      >
        <ProductCard product={product} featured={i % 7 === 0} />
      </div>
    ))}
  </div>
</div>
```

- [ ] **Step 4: Add framer-motion layout animation**

Wrap the grid in `<motion.div layout>` and each card in `<motion.div layout key={product.id}>` so filter transitions animate smoothly:

```typescript
import { motion, AnimatePresence } from "framer-motion";

// grid wrapper:
<motion.div layout className="grid grid-cols-2 md:grid-cols-3 gap-4">
  <AnimatePresence>
    {filteredProducts.map((product, i) => (
      <motion.div
        key={product.id}
        layout
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.25 }}
        className={i % 7 === 0 ? "row-span-2" : i % 7 === 3 ? "md:col-span-2" : ""}
      >
        <ProductCard product={product} featured={i % 7 === 0} />
      </motion.div>
    ))}
  </AnimatePresence>
</motion.div>
```

- [ ] **Step 5: Verify**

```bash
npm run dev
```

Visit `/categories`. Grid should show masonry layout. Filter by category — cards animate out/in. Glass sticky filter bar visible.

- [ ] **Step 6: TypeScript check**

```bash
npm run check
```

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/
git commit -m "feat: collections — masonry grid, glass sticky filter bar, animated filter transitions"
```

---

## Task 7: Skeleton Shimmer on Loading States

**Files:**
- Modify: `client/src/components/ui/skeleton.tsx`
- Modify: `client/src/pages/Home.tsx`
- Modify: `client/src/pages/Collections.tsx` (or equivalent)

- [ ] **Step 1: Add shimmer to Skeleton component**

Open `client/src/components/ui/skeleton.tsx`. Find the `Skeleton` component. Add `skeleton-shimmer` class:

```typescript
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("skeleton-shimmer rounded-md", className)}
      {...props}
    />
  )
}
```

The `skeleton-shimmer` class is already defined in index.css from Task 2.

- [ ] **Step 2: Add product card skeleton**

Create a `ProductCardSkeleton` component in `ProductCard.tsx`:

```typescript
export function ProductCardSkeleton() {
  return (
    <div style={{ borderRadius: "var(--radius-card)", overflow: "hidden" }}>
      <Skeleton className="w-full aspect-square" />
    </div>
  );
}
```

Import `Skeleton` from `@/components/ui/skeleton`.

- [ ] **Step 3: Use skeletons in loading states**

In `Home.tsx`, where products show while loading:
```typescript
{isLoadingProducts ? (
  <div className="flex gap-5 overflow-x-auto px-4 sm:px-6">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="flex-shrink-0 w-[240px]">
        <ProductCardSkeleton />
      </div>
    ))}
  </div>
) : /* existing products strip */}
```

- [ ] **Step 4: Commit**

```bash
git add client/src/components/ui/skeleton.tsx client/src/components/ProductCard.tsx client/src/pages/Home.tsx
git commit -m "feat: skeleton shimmer loading states on product cards and collections grid"
```

---

## Verification

After all 7 tasks:

- [ ] `npm run test` — all tests pass
- [ ] `npm run check` — 0 TypeScript errors
- [ ] Manual: Homepage shows hero → magazine grid → products strip → philosophy → WhatsApp CTA → footer
- [ ] Manual: ProductCard has glass info strip, hover lifts with glow, wishlist heart appears
- [ ] Manual: Collections page shows masonry grid, glass filter bar, animated filter transitions
- [ ] Manual: Wishlist heart saves product across page navigations (localStorage persists)
- [ ] Manual: Skeleton shimmer shows during loading
