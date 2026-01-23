import { useRoute } from "wouter";
import { Layout } from "@/components/Layout";
import { useProduct } from "@/hooks/use-products";
import { useCategory } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { Box, Check, ChevronRight } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";

export default function ProductDetails() {
  const [match, params] = useRoute("/products/:id");
  const id = params ? parseInt(params.id) : 0;
  const { data: product, isLoading } = useProduct(id);
  const { data: category } = useCategory(product?.categoryId || 0);
  
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

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
      <div className="container mx-auto px-4 py-8 lg:py-16">
        {/* Breadcrumbs */}
        <div className="flex items-center text-sm text-muted-foreground mb-8">
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20">
          {/* Images */}
          <div className="space-y-4">
            <div className="overflow-hidden rounded-sm bg-muted/20" ref={emblaRef}>
              <div className="flex">
                {product.images?.map((src, i) => (
                  <div className="flex-[0_0_100%] min-w-0" key={i}>
                    <img src={src} className="w-full h-auto object-cover aspect-[4/5]" alt={`${product.name} ${i + 1}`} />
                  </div>
                ))}
              </div>
            </div>
            
            {/* Thumbs */}
            <div className="flex gap-4 overflow-x-auto pb-2">
              {product.images?.map((src, i) => (
                <button
                  key={i}
                  onClick={() => scrollTo(i)}
                  className={cn(
                    "relative flex-[0_0_80px] aspect-square rounded-sm overflow-hidden border-2 transition-all",
                    selectedIndex === i ? "border-primary opacity-100" : "border-transparent opacity-60 hover:opacity-100"
                  )}
                >
                  <img src={src} className="w-full h-full object-cover" alt="thumbnail" />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-8">
            <div className="space-y-2 border-b border-border pb-8">
              <h1 className="font-serif text-4xl lg:text-5xl font-medium text-foreground">{product.name}</h1>
              <div className="text-2xl font-light text-muted-foreground">
                ${(product.price / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="prose prose-stone text-muted-foreground">
              <p>{product.description}</p>
            </div>

            {/* Colors */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-3">
                <span className="text-sm font-bold uppercase tracking-wider">Finish</span>
                <div className="flex gap-3">
                  {product.colors.map((color) => (
                    <div 
                      key={color} 
                      className="w-10 h-10 rounded-full border border-border cursor-pointer shadow-sm relative group"
                      style={{ backgroundColor: color }}
                      title={color}
                    >
                      <div className="absolute inset-0 rounded-full ring-2 ring-primary ring-offset-2 opacity-0 group-hover:opacity-50 transition-opacity" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {product.sizes && product.sizes.length > 0 && (
              <div className="space-y-3">
                <span className="text-sm font-bold uppercase tracking-wider">Size</span>
                <div className="flex flex-wrap gap-3">
                  {product.sizes.map((size) => (
                    <div 
                      key={size} 
                      className="px-4 py-2 border border-border text-sm font-medium cursor-pointer hover:border-primary hover:text-primary transition-colors min-w-[3rem] text-center"
                    >
                      {size}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="pt-8 space-y-4">
              {product.arLink ? (
                <a 
                  href={product.arLink} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="block w-full"
                  data-testid="link-ar-view"
                >
                  <Button size="lg" className="w-full h-14 text-base tracking-widest uppercase font-bold gap-3 rounded-none shadow-xl shadow-primary/10" data-testid="button-ar-view">
                    <Box className="w-5 h-5" /> View in Reality (AR)
                  </Button>
                </a>
              ) : (
                <div className="p-4 bg-muted/50 text-sm text-center text-muted-foreground rounded-sm">
                  AR View not available for this item
                </div>
              )}
              
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground uppercase tracking-widest pt-2">
                <Check className="w-4 h-4 text-green-500" /> In Stock & Ready to Ship
              </div>
            </div>
            
            {/* Specs Accordion could go here */}
          </div>
        </div>
      </div>
    </Layout>
  );
}
