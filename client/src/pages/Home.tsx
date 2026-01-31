import { Layout } from "@/components/Layout";
import { useCategories } from "@/hooks/use-categories";
import { useProducts } from "@/hooks/use-products";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, Box, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import type { Category } from "@shared/schema";

// Categories Carousel Component
function CategoriesCarousel({ categories, isLoading }: { categories: Category[], isLoading: boolean }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({
    align: "start",
    containScroll: "trimSnaps",
    slidesToScroll: 1,
    dragFree: true,
  });

  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="flex items-end justify-between mb-12">
          <div className="space-y-4">
            <h2 className="font-serif text-3xl md:text-4xl">Curated Collections</h2>
            <p className="text-muted-foreground">Each piece tells a story of craftsmanship and luxury.</p>
          </div>
          
          {/* Navigation Arrows */}
          <div className="hidden sm:flex gap-2">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full disabled:opacity-30"
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              data-testid="button-carousel-prev"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="rounded-full disabled:opacity-30"
              onClick={scrollNext}
              disabled={!canScrollNext}
              data-testid="button-carousel-next"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Carousel Container - pr-16 ensures partial peek of next card */}
        <div className="overflow-hidden -mr-4 sm:-mr-8" ref={emblaRef}>
          <div className="flex gap-4 pr-4 sm:pr-8">
            {isLoading ? (
              [1, 2, 3, 4].map((i) => (
                <div 
                  key={i} 
                  className="flex-none w-[75%] sm:w-[45%] lg:w-[30%] aspect-[3/4] bg-muted animate-pulse rounded-2xl" 
                />
              ))
            ) : (
              categories.map((category, index) => (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="flex-none w-[75%] sm:w-[45%] lg:w-[30%]"
                >
                  <Link href={`/categories/${category.id}`}>
                    <div className="group relative aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer" data-testid={`category-card-${category.id}`}>
                      {/* Category Image */}
                      {category.imageUrl ? (
                        <img 
                          src={category.imageUrl} 
                          alt={category.name}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground">No Image</span>
                        </div>
                      )}
                      
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                      
                      {/* Category Info */}
                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <h3 className="font-serif text-xl md:text-2xl font-medium mb-1">{category.name}</h3>
                        <p className="text-sm text-white/70 uppercase tracking-wider">View Collection</p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))
            )}
          </div>
        </div>
        
        {/* Mobile scroll hint */}
        <p className="text-center text-xs text-muted-foreground mt-6 sm:hidden">
          Swipe to explore more collections
        </p>
      </div>
    </section>
  );
}

export default function Home() {
  const { data: categories, isLoading: isCategoriesLoading } = useCategories();
  const { data: featuredProducts, isLoading: isProductsLoading } = useProducts();
  const [showARTutorial, setShowARTutorial] = useState(false);

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
      {/* Hero Section */}
      <section className="relative h-[85vh] w-full overflow-hidden">
        {/* Unsplash luxury living room */}
        <img 
          src="https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?q=80&w=1974&auto=format&fit=crop" 
          alt="Luxury Interior" 
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30" />
        
        <div className="relative container mx-auto h-full flex items-center px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="max-w-xl text-white space-y-6"
          >
            <h1 className="font-serif text-5xl md:text-7xl font-bold leading-tight">
              Timeless Elegance for Modern Living
            </h1>
            <p className="text-lg md:text-xl text-white/90 font-light max-w-md">
              Discover a curated collection of furniture that defines sophistication. Designed for those who appreciate the finer details.
            </p>
            <div className="pt-4">
              <Link href="/categories">
                <Button size="lg" className="bg-white text-black hover:bg-white/90 rounded-none px-8 py-6 text-sm tracking-widest uppercase font-bold">
                  Explore Collection
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Featured Categories - Horizontal Carousel */}
      <CategoriesCarousel 
        categories={categories?.filter(c => !c.isHidden) || []} 
        isLoading={isCategoriesLoading} 
      />

      {/* Philosophy / About Block */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative aspect-[4/3]">
              {/* Unsplash craftsman working on wood */}
              <img 
                src="https://images.unsplash.com/photo-1581539250439-c96689b516dd?w=800&q=80" 
                alt="Craftsmanship" 
                className="w-full h-full object-cover rounded-sm shadow-xl"
              />
            </div>
            <div className="order-1 md:order-2 space-y-6 md:pl-12">
              <h2 className="font-serif text-3xl md:text-4xl leading-tight">Designed for the Senses, <br/>Built for Generations</h2>
              <p className="text-muted-foreground leading-relaxed">
                We believe furniture is more than just functional objects; it is the soul of a home. Our pieces are crafted with the finest materials—solid hardwoods, full-grain leathers, and premium textiles—to ensure they age beautifully.
              </p>
              <div className="flex gap-8 pt-4">
                <div>
                  <h4 className="font-serif text-2xl font-bold text-primary">100%</h4>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Handmade</p>
                </div>
                <div>
                  <h4 className="font-serif text-2xl font-bold text-primary">25+</h4>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground mt-1">Year Warranty</p>
                </div>
              </div>
              <Button variant="ghost" className="px-0 text-primary hover:text-primary/80 hover:bg-transparent uppercase tracking-widest text-xs font-bold mt-4">
                Read Our Story <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-end mb-12">
            <div>
              <h2 className="font-serif text-3xl md:text-4xl mb-2">New Arrivals</h2>
              <p className="text-muted-foreground">The latest additions to our catalog.</p>
            </div>
            <Link href="/categories">
              <Button variant="outline" className="hidden sm:flex rounded-none border-foreground/20 hover:border-foreground hover:bg-transparent">
                View All
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {isProductsLoading ? (
              [1, 2, 3, 4].map((i) => <div key={i} className="aspect-[4/5] bg-muted animate-pulse" />)
            ) : (
              featuredProducts?.filter(p => !p.isHidden).slice(0, 4).map((product) => (
                <ProductCard key={product.id} product={product} />
              ))
            )}
          </div>
          
          <div className="mt-8 text-center sm:hidden">
            <Link href="/categories">
              <Button variant="outline" className="w-full rounded-none">View All</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* AR Feature Teaser */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="container mx-auto px-4 relative z-10 text-center max-w-3xl">
          <h2 className="font-serif text-3xl md:text-5xl mb-6 font-medium">Experience It In Your Home</h2>
          <p className="text-lg opacity-90 mb-10 leading-relaxed font-light">
            Unsure if it fits? Use our Augmented Reality feature to visualize our pieces directly in your space using just your smartphone. No app required.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-white/90 rounded-none px-12 py-7 font-bold tracking-widest uppercase text-sm shadow-2xl"
              onClick={() => setShowARTutorial(true)}
            >
              Browse with AR
            </Button>
          </div>
        </div>
      </section>
    </Layout>
  );
}

