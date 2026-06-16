import { useRoute } from "wouter";
import { Layout } from "@/components/Layout";
import { useProduct } from "@/hooks/use-products";
import { useCategory } from "@/hooks/use-categories";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { Box, Check, ChevronRight, Clock, X } from "lucide-react";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";
import { ARStudio } from "@/components/ARStudio";
import { ARStudioErrorBoundary } from "@/components/ErrorBoundary";
import { useSettings } from "@/hooks/use-settings";
import { ProductInquirySheet } from "@/components/ProductInquirySheet";
import { QRCodeSVG } from "qrcode.react";
import { useQuery } from "@tanstack/react-query";
import type { ProductModel, ProductMaterial, Product } from "@shared/schema";
import { InlineModelViewer } from "@/components/InlineModelViewer";
import { ProductCard } from "@/components/ProductCard";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetails() {
  const [match, params] = useRoute("/products/:id");
  const id = params ? parseInt(params.id) : 0;
  const { data: product, isLoading } = useProduct(id);
  const { data: category } = useCategory(product?.categoryId || 0);
  const { data: settings } = useSettings();
  const currencySymbol = settings?.currencySymbol ?? "$";
  
  const { data: productModels = [] } = useQuery<ProductModel[]>({
    queryKey: [`/api/products/${id}/models`],
    enabled: !!id,
  });

  const { data: productMaterials = [] } = useQuery<ProductMaterial[]>({
    queryKey: [`/api/products/${id}/materials`],
    enabled: !!id,
  });

  const { data: measurements = [] } = useQuery<{id: number; label: string; value: string}[]>({
    queryKey: [`/api/products/${id}/measurements`],
    enabled: !!id,
  });

  const { data: relatedProducts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products", "related", id, product?.categoryId],
    queryFn: async () => {
      if (!product?.categoryId) return [];
      const res = await fetch(`/api/products?categoryId=${product.categoryId}`);
      if (!res.ok) return [];
      const all = await res.json();
      return (all as Product[]).filter((p: Product) => p.id !== id && !p.isHidden).slice(0, 5);
    },
    enabled: !!product?.categoryId,
  });

  const { toast } = useToast();

  const defaultModel = productModels.find(m => m.isDefault) ?? productModels[0];
  const defaultMaterial = productMaterials.find(m => m.isDefault && (!m.modelId || m.modelId === defaultModel?.id));

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [arViewerOpen, setArViewerOpen] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [arSupported, setArSupported] = useState<boolean | null>(null);
  const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"3D Model" | "Photos">("3D Model");

  useEffect(() => {
    if (defaultMaterial && activeMaterialId === null) {
      setActiveMaterialId(defaultMaterial.id);
    }
  }, [defaultMaterial, activeMaterialId]);

  useEffect(() => {
    const check = async () => {
      let iosAR = false;
      try {
        iosAR = typeof document !== "undefined" &&
          !!(document.createElement("a").relList?.supports?.("ar"));
      } catch {
        iosAR = false;
      }
      const webxrAR = await (navigator as any).xr
        ?.isSessionSupported?.("immersive-ar")
        .catch(() => false);
      setArSupported(!!(iosAR || webxrAR));
    };
    check();
  }, []);

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
          {/* Left column: 3D viewer (primary) or image carousel (fallback) */}
          <div className="space-y-3 sm:space-y-4">
            {defaultModel ? (
              <>
                {/* 3D / Photos tab switcher */}
                <div className="flex gap-2">
                  {(["3D Model", "Photos"] as const).map(tab => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className="px-4 py-1.5 text-xs uppercase tracking-widest transition-all duration-200"
                      style={{
                        borderRadius: "var(--radius-pill)",
                        background: activeTab === tab ? "var(--accent)" : "var(--surface-1)",
                        color: activeTab === tab ? "#000" : "var(--text-secondary)",
                        border: `1px solid ${activeTab === tab ? "var(--accent)" : "var(--glass-border)"}`,
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === "3D Model" ? (
                  <div style={{ aspectRatio: "4/5", minHeight: 320 }}>
                    <InlineModelViewer
                      modelUrl={defaultModel.modelUrl}
                      materials={productMaterials.filter(m => !m.modelId || m.modelId === defaultModel.id)}
                      activeMaterialId={activeMaterialId}
                      className="w-full h-full"
                    />
                  </div>
                ) : (
                  /* Photo carousel */
                  <div className="overflow-hidden rounded-2xl sm:rounded-sm bg-muted/20" ref={emblaRef}>
                    <div className="flex">
                      {product.images?.map((src, i) => (
                        <div className="flex-[0_0_100%] min-w-0" key={i}>
                          <img src={src} className="w-full h-auto object-cover aspect-square sm:aspect-[4/5]" alt={`${product.name} ${i + 1}`} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* No 3D model: show photo carousel as primary */
              <div className="overflow-hidden rounded-2xl sm:rounded-sm bg-muted/20" ref={emblaRef}>
                <div className="flex">
                  {product.images?.map((src, i) => (
                    <div className="flex-[0_0_100%] min-w-0" key={i}>
                      <img src={src} className="w-full h-auto object-cover aspect-square sm:aspect-[4/5]" alt={`${product.name} ${i + 1}`} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Photo thumbnail strip — always shown when photos exist */}
            {product.images && product.images.length > 0 && (
              <div className="flex gap-2 sm:gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {product.images.map((src, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      scrollTo(i);
                      if (defaultModel) setActiveTab("Photos");
                    }}
                    className="relative flex-shrink-0 transition-all duration-200"
                    style={{
                      width: 60, height: 60,
                      borderRadius: "var(--radius-input)",
                      overflow: "hidden",
                      border: `2px solid ${selectedIndex === i && activeTab === "Photos" ? "var(--accent)" : "transparent"}`,
                      opacity: selectedIndex === i && activeTab === "Photos" ? 1 : 0.6,
                    }}
                  >
                    <img src={src} className="w-full h-full object-cover" alt="thumbnail" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details - Compact on mobile */}
          <div className="space-y-5 sm:space-y-8">
            <div className="space-y-1 sm:space-y-2 border-b border-border pb-4 sm:pb-8">
              {category && (
                <p className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">{category.name}</p>
              )}
              <h1 className="font-serif text-2xl sm:text-4xl lg:text-5xl font-medium text-foreground">{product.name}</h1>
              <div className="text-xl sm:text-2xl font-semibold text-foreground">
                {currencySymbol}{Math.round(product.price / 100).toLocaleString()}
              </div>
            </div>

            <div className="text-sm sm:text-base text-muted-foreground leading-relaxed">
              <p>{product.description}</p>
            </div>

            {/* Material swatches — shown when 3D model has materials */}
            {productMaterials.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                    Material
                  </span>
                  <span className="text-xs" style={{ color: "var(--accent)" }}>
                    {productMaterials.find(m => m.id === activeMaterialId)?.colorName || ""}
                  </span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  {productMaterials
                    .filter(m => !m.modelId || m.modelId === defaultModel?.id)
                    .map(material => {
                      const isActive = activeMaterialId === material.id;
                      return (
                        <button
                          key={material.id}
                          type="button"
                          title={material.colorName || material.name}
                          onClick={() => setActiveMaterialId(material.id)}
                          style={{
                            width: 32, height: 32,
                            borderRadius: "50%",
                            background: material.colorHex,
                            border: `2px solid ${isActive ? "var(--accent)" : "var(--glass-border)"}`,
                            transform: isActive ? "scale(1.15)" : "scale(1)",
                            boxShadow: isActive ? `0 0 0 3px var(--accent-glow)` : "none",
                            transition: "all 0.2s",
                            flexShrink: 0,
                          }}
                        />
                      );
                    })}
                </div>
              </div>
            )}

            {/* Flexible Specs */}
            {Array.isArray(product.specs) && product.specs.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                  Specifications
                </p>
                <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--glass-border)" }}>
                  {(product.specs as Array<{ label: string; value: string }>).map((spec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 px-4 py-2.5 text-sm"
                      style={{
                        background: i % 2 === 0 ? "var(--surface-1)" : "var(--surface-2)",
                        borderBottom: i < (product.specs as any[]).length - 1 ? `1px solid var(--glass-border)` : "none",
                      }}
                    >
                      <span className="w-28 flex-shrink-0 font-medium text-xs uppercase tracking-wide"
                        style={{ color: "var(--text-secondary)" }}>
                        {spec.label}
                      </span>
                      <span style={{ color: "var(--text-primary)" }}>{spec.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fallback to measurements if no specs */}
            {(!Array.isArray(product.specs) || (product.specs as any[]).length === 0) && measurements.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>Dimensions</p>
                <div className="flex gap-2 flex-wrap">
                  {measurements.map((m, i) => (
                    <div key={i} className="px-3 py-2 glass text-xs" style={{ borderRadius: "var(--radius-input)" }}>
                      <span style={{ color: "var(--text-secondary)" }}>{m.label}: </span>
                      <span style={{ color: "var(--text-primary)" }}>{m.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Colors - Compact on mobile */}
            {product.colors && product.colors.length > 0 && (
              <div className="space-y-2 sm:space-y-3">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">Finish</span>
                <div className="flex gap-2 sm:gap-3">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color === selectedColor ? null : color)}
                      aria-label={`color ${color}`}
                      className={cn(
                        "w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-border shadow-sm relative transition-all",
                        selectedColor === color
                          ? "ring-2 ring-primary ring-offset-2 scale-110"
                          : "hover:scale-105"
                      )}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
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
                    <button
                      key={size}
                      onClick={() => setSelectedSize(size === selectedSize ? null : size)}
                      className={cn(
                        "px-3 sm:px-4 py-1.5 sm:py-2 border text-xs sm:text-sm font-medium transition-colors rounded-full sm:rounded-none",
                        selectedSize === size
                          ? "border-primary text-primary bg-primary/5"
                          : "border-border hover:border-primary hover:text-primary"
                      )}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions - Rounded on mobile */}
            <div className="pt-4 sm:pt-8 space-y-3 sm:space-y-4">
              {product.stockStatus !== "out_of_stock" ? (
                <>
                  {product.arLink ? (
                    arSupported === false ? (
                      <div className="flex flex-col items-center gap-3 p-4 border border-border rounded-xl sm:rounded-sm bg-muted/30">
                        <QRCodeSVG value={typeof window !== "undefined" ? window.location.href : ""} size={120} data-testid="qrcode" />
                        <p className="text-xs text-center text-muted-foreground">
                          Scan on your phone to view in your space
                        </p>
                      </div>
                    ) : (
                      <Button
                        size="lg"
                        data-testid="button-ar-view"
                        className="w-full h-12 sm:h-14 text-sm sm:text-base tracking-widest uppercase font-bold gap-2 sm:gap-3 rounded-full sm:rounded-none shadow-xl shadow-primary/10"
                        onClick={() => setArViewerOpen(true)}
                      >
                        <Box className="w-4 h-4 sm:w-5 sm:h-5" /> View in Reality
                      </Button>
                    )
                  ) : (
                    <div className="p-3 sm:p-4 bg-muted/50 text-xs sm:text-sm text-center text-muted-foreground rounded-xl sm:rounded-sm">
                      AR View not available for this item
                    </div>
                  )}

                  <ProductInquirySheet
                    product={product}
                    selectedColor={selectedColor}
                    selectedSize={selectedSize}
                  />
                </>
              ) : null}

              {product.stockStatus === "in_stock" && (
                <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-muted-foreground uppercase tracking-widest pt-1 sm:pt-2">
                  <Check className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" /> In Stock & Ready to Ship
                </div>
              )}
              {product.stockStatus === "made_to_order" && (
                <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-amber-600 uppercase tracking-widest pt-1 sm:pt-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" /> Made to Order — 6–8 Weeks
                </div>
              )}
              {product.stockStatus === "out_of_stock" && (
                <div className="flex items-center justify-center gap-2 text-[10px] sm:text-xs text-red-500 uppercase tracking-widest pt-1 sm:pt-2">
                  <X className="w-3 h-3 sm:w-4 sm:h-4" /> Currently Unavailable
                </div>
              )}

              {/* Share button */}
              <button
                type="button"
                onClick={async () => {
                  const shareData = { title: product.name, url: window.location.href };
                  if (navigator.share) {
                    try { await navigator.share(shareData); } catch { /* user cancelled */ }
                  } else {
                    try {
                      await navigator.clipboard.writeText(window.location.href);
                      toast({ title: "Link copied", description: "Product link copied to clipboard" });
                    } catch {
                      toast({ title: "Link copied", description: window.location.href });
                    }
                  }
                }}
                className="w-full py-3 text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
                style={{
                  border: "1px solid var(--glass-border)",
                  borderRadius: "var(--radius-btn)",
                  color: "var(--text-secondary)",
                  background: "var(--surface-1)",
                }}
              >
                Share This Piece
              </button>
            </div>
          </div>
        </div>

        {/* Rich optional sections */}
        {product.sections && (
          <div className="space-y-3 mt-12 mb-8">
            {[
              { key: "story", label: "The Story" },
              { key: "care", label: "Care & Maintenance" },
              { key: "delivery", label: "Delivery Information" },
            ]
              .filter(({ key }) => !!(product.sections as any)?.[key])
              .map(({ key, label }) => (
                <details
                  key={key}
                  className="group glass"
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  <summary
                    className="flex items-center justify-between px-6 py-4 cursor-pointer list-none"
                    style={{ color: "var(--text-primary)" }}
                  >
                    <span className="font-medium" style={{ fontFamily: "var(--font-serif)" }}>{label}</span>
                    <span className="text-lg group-open:rotate-45 transition-transform duration-200"
                      style={{ color: "var(--accent)" }}>+</span>
                  </summary>
                  <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {(product.sections as any)[key]}
                  </div>
                </details>
              ))}

            {/* Custom sections */}
            {Array.isArray((product.sections as any)?.custom) &&
              (product.sections as any).custom.map((section: { title: string; body: string }, i: number) => (
                <details
                  key={i}
                  className="group glass"
                  style={{ borderRadius: "var(--radius-card)" }}
                >
                  <summary className="flex items-center justify-between px-6 py-4 cursor-pointer list-none"
                    style={{ color: "var(--text-primary)" }}>
                    <span className="font-medium" style={{ fontFamily: "var(--font-serif)" }}>{section.title}</span>
                    <span className="text-lg group-open:rotate-45 transition-transform duration-200"
                      style={{ color: "var(--accent)" }}>+</span>
                  </summary>
                  <div className="px-6 pb-5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                    {section.body}
                  </div>
                </details>
              ))}
          </div>
        )}

        {/* Related products strip */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 mb-4">
            <h3 className="font-medium text-xl mb-6"
              style={{ fontFamily: "var(--font-serif)", color: "var(--text-primary)" }}>
              From the same collection
            </h3>
            <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
              {relatedProducts.map(p => (
                <div key={p.id} className="flex-shrink-0 w-[200px] sm:w-[240px]">
                  <ProductCard product={p} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Full-screen 3D Studio Overlay */}
      {arViewerOpen && product.arLink && (
        <ARStudioErrorBoundary>
          <ARStudio product={product} onClose={() => setArViewerOpen(false)} />
        </ARStudioErrorBoundary>
      )}
    </Layout>
  );
}
