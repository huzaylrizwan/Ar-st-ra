import { useRoute } from "wouter";
import { Layout } from "@/components/Layout";
import { useProduct } from "@/hooks/use-products";
import { useCategory } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Box, Check, ChevronRight, X } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import "@google/model-viewer";

export default function ProductDetails() {
  const [match, params] = useRoute("/products/:id");
  const id = params ? parseInt(params.id) : 0;
  const { data: product, isLoading } = useProduct(id);
  const { data: category } = useCategory(product?.categoryId || 0);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [arViewerOpen, setArViewerOpen] = useState(false);

  useEffect(() => {
    if (arViewerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [arViewerOpen]);

  // Re-sync index when embla changes
  if (emblaApi) {
    emblaApi.on("select", () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
    });
  }

  const scrollTo = (index: number) => emblaApi && emblaApi.scrollTo(index);

  if (isLoading) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-12">
          <Skeleton className="aspect-square w-full" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/4" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!product) return <div className="p-12 text-center">Product not found</div>;

  return (
    <Layout>
      <div className="container mx-auto px-4 py-4 sm:py-8 lg:py-16">
        {/* Breadcrumbs - Hidden on mobile */}
        <div className="hidden sm:flex items-center text-sm text-muted-foreground mb-8">
          <a href="/" className="hover:text-primary">Home</a>
          <ChevronRight className="w-4 h-4 mx-2" />
          <a href="/categories" className="hover:text-primary">Collections</a>
          {category && (
            <>
              <ChevronRight className="w-4 h-4 mx-2" />
              <a href={`/categories?id=${category.id}`} className="hover:text-primary">{category.name}</a>
            </>
          )}
          <ChevronRight className="w-4 h-4 mx-2" />
          <span className="text-foreground font-medium">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-12 lg:gap-20">
          {/* Images - Rounded on mobile */}
          <div className="space-y-3 sm:space-y-4">
            <div className="overflow-hidden rounded-2xl sm:rounded-sm bg-muted/20" ref={emblaRef}>
              <div className="flex">
                {product.images?.map((src, i) => (
                  <div className="flex-[0_0_100%] min-w-0" key={i}>
                    <img src={src} className="w-full h-auto object-cover aspect-square sm:aspect-[4/5]" alt={`${product.name} ${i + 1}`} />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Thumbs - Compact on mobile */}
            <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2">
              {product.images?.map((src, i) => (
                <button
                  key={i}
                  onClick={() => scrollTo(i)}
                  className={cn(
                    "relative flex-[0_0_60px] sm:flex-[0_0_80px] aspect-square rounded-xl sm:rounded-sm overflow-hidden border-2 transition-all",
                    selectedIndex === i ? "border-primary opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={src} className="w-full h-full object-cover" alt="thumbnail" />
                </button>
              ))}
            </div>
          </div>

          {/* Details - Compact on mobile */}
          <div className="space-y-5 sm:space-y-8">
            <div className="space-y-1 sm:space-y-2 border-b border-border pb-4 sm:pb-8">
              {category && (
                <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">{category.name}</p>
              )}
              <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-medium text-foreground">{product.name}</h1>
              <div className="text-xl sm:text-2xl font-semibold text-foreground">
                ${Math.round(product.price / 100).toLocaleString()}
              </div>
            </div>

            <div className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>{product.description}</p>
            </div>

            {/* Colors - Compact on mobile */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Finish</span>
                <div className="flex gap-2 sm:gap-3">
                  {product.colors.map((color) => (
                    <div 
                      key={color} 
                      className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border cursor-pointer shadow-sm relative group"
                      style={{ backgroundColor: color }}
                      title={color}
                    >
                      <div className="absolute inset-0 rounded-full ring-2 ring-primary ring-offset-2 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes - Compact rounded pills on mobile */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Size</span>
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  {product.sizes.map((size) => (
                    <div 
                      key={size} 
                      className="px-3 sm:px-4 py-1.5 sm:py-2 border border-border text-xs sm:text-sm font-medium cursor-pointer hover:border-primary hover:text-primary transition-colors rounded-full sm:rounded-none"
                    >
                      {size}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions - Rounded on mobile */}
            <div className="pt-4 sm:pt-8 space-y-3 sm:space-y-4">
              {product.arLink ? (
                <Button
                  size="lg"
                  className="w-full h-12 sm:h-14 text-sm sm:text-base tracking-widest uppercase font-bold gap-2 sm:gap-3 rounded-full sm:rounded-none shadow-xl shadow-primary/10"
                  onClick={() => setArViewerOpen(true)}
                  data-testid="button-ar-view"
                >
                  <Box className="w-4 h-4 sm:w-5 sm:h-5" /> View in Reality
                </Button>
              ) : (
                <div className="p-3 sm:p-4 bg-muted/50 text-xs sm:text-sm text-center text-muted-foreground rounded-xl sm:rounded-sm">
                  AR View not available for this item
                </div>
              )}
              
              <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest pt-1 sm:pt-2">
                <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" /> In Stock & Ready to Ship
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Full-screen AR Viewer Overlay */}
      {arViewerOpen && product.arLink && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          data-testid="ar-viewer-overlay"
        >
          <div className="relative flex items-center justify-between px-4 py-3 bg-black/80 text-white shrink-0">
            <span className="font-medium text-sm">{product.name}</span>
            <button
              onClick={() => setArViewerOpen(false)}
              className="p-2 rounded-full hover:bg-white/10 transition-colors"
              data-testid="button-close-ar-viewer"
              aria-label="Close AR viewer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <model-viewer
            src={product.arLink}
            alt={`3D model of ${product.name}`}
            camera-controls
            ar
            ar-modes="scene-viewer quick-look"
            auto-rotate
            shadow-intensity="1"
            style={{ width: "100%", flex: 1, background: "#111" }}
          />
        </div>
      )}
    </Layout>
  );
}
