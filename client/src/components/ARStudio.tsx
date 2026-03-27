import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Box, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Product, ProductMaterial } from "@shared/schema";
import type { ModelViewerElement } from "@google/model-viewer";
import type { Texture as MVTexture } from "@google/model-viewer/lib/features/scene-graph/texture";
import "@google/model-viewer";

interface ARStudioProps {
  product: Product;
  onClose: () => void;
}

export function ARStudio({ product, onClose }: ARStudioProps) {
  const modelViewerRef = useRef<ModelViewerElement>(null);
  const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);
  const [isApplyingTexture, setIsApplyingTexture] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);
  const originalMaterialRef = useRef<{
    colorFactor: number[] | null;
    originalTexture: MVTexture | null;
  } | null>(null);

  const { data: materials } = useQuery<ProductMaterial[]>({
    queryKey: ["/api/products", product.id, "materials"],
    queryFn: async () => {
      const res = await fetch(`/api/products/${product.id}/materials`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to fetch materials");
      return res.json();
    },
  });

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const captureOriginalMaterial = useCallback(() => {
    const mv = modelViewerRef.current;
    if (!mv || originalMaterialRef.current !== null) return;
    const model = mv.model;
    if (!model || !model.materials || model.materials.length === 0) return;
    const mat = model.materials[0];
    const pbr = mat.pbrMetallicRoughness;
    originalMaterialRef.current = {
      colorFactor: pbr.baseColorFactor ? [...pbr.baseColorFactor] : null,
      // Store the texture object itself so we can restore it
      originalTexture: pbr.baseColorTexture ? pbr.baseColorTexture.texture : null,
    };
  }, []);

  const hexToRgba = (hex: string): [number, number, number, number] => {
    const h = hex.replace("#", "");
    return [
      parseInt(h.substring(0, 2), 16) / 255,
      parseInt(h.substring(2, 4), 16) / 255,
      parseInt(h.substring(4, 6), 16) / 255,
      1,
    ];
  };

  const applyMaterialById = useCallback(async (material: ProductMaterial) => {
    if (isApplyingTexture) return;
    setActiveMaterialId(material.id);
    const mv = modelViewerRef.current;
    if (!mv) return;
    setIsApplyingTexture(true);
    try {
      const model = mv.model;
      if (!model || !model.materials || model.materials.length === 0) return;
      const mat = model.materials[0];
      const pbr = mat.pbrMetallicRoughness;

      if (material.textureUrl) {
        if (pbr.baseColorTexture) {
          // Model has a texture slot — create and swap in the new texture
          const texture = await mv.createTexture(material.textureUrl);
          if (texture) {
            pbr.baseColorTexture.setTexture(texture);
            // Apply UV tiling so PNG covers the model and doesn't look flat
            texture.sampler.setScale({ u: 2, v: 2 });
            // Reset color factor to white so texture shows at full brightness
            pbr.setBaseColorFactor([1, 1, 1, 1]);
          }
        } else {
          // Model has no texture slot — fall back to colorHex tint
          pbr.setBaseColorFactor(hexToRgba(material.colorHex));
        }
      } else {
        // Color-only: clear any previously-applied texture and apply flat color
        if (pbr.baseColorTexture) {
          pbr.baseColorTexture.setTexture(null);
        }
        pbr.setBaseColorFactor(hexToRgba(material.colorHex));
      }
    } catch (err) {
      console.error("Failed to apply material:", err);
    } finally {
      setIsApplyingTexture(false);
    }
  }, [isApplyingTexture]);

  const resetToDefault = useCallback(async () => {
    setActiveMaterialId(null);
    const mv = modelViewerRef.current;
    if (!mv) return;
    const orig = originalMaterialRef.current;
    if (!orig) return;
    const model = mv.model;
    if (!model || !model.materials || model.materials.length === 0) return;
    const mat = model.materials[0];
    const pbr = mat.pbrMetallicRoughness;

    // Restore original color factor
    if (orig.colorFactor) {
      pbr.setBaseColorFactor(orig.colorFactor as [number, number, number, number]);
    }

    // Restore original texture state
    if (pbr.baseColorTexture) {
      if (orig.originalTexture) {
        // Original had a texture — restore it and reset UV tiling
        pbr.baseColorTexture.setTexture(orig.originalTexture);
        orig.originalTexture.sampler.setScale(null);
      } else {
        // Original had no texture — clear any applied texture
        pbr.baseColorTexture.setTexture(null);
      }
    }
  }, []);

  const materialsRef = useRef(materials);
  materialsRef.current = materials;

  // Attach native load event listener to model-viewer
  useEffect(() => {
    const mv = modelViewerRef.current;
    if (!mv) return;

    const handleLoad = () => {
      setModelLoaded(true);
      captureOriginalMaterial();
      // Auto-apply default material
      const mats = materialsRef.current;
      if (mats) {
        const defaultMat = mats.find(m => m.isDefault);
        if (defaultMat) {
          applyMaterialById(defaultMat);
        }
      }
    };

    mv.addEventListener("load", handleLoad);
    return () => mv.removeEventListener("load", handleLoad);
  }, [captureOriginalMaterial]);

  // When materials load after model already loaded, auto-apply default
  useEffect(() => {
    if (modelLoaded && materials) {
      const defaultMat = materials.find(m => m.isDefault);
      if (defaultMat && activeMaterialId === null) {
        applyMaterialById(defaultMat);
      }
    }
  }, [materials, modelLoaded]);

  const launchAR = () => {
    const mv = modelViewerRef.current;
    if (mv && modelLoaded) {
      mv.activateAR();
    }
  };

  const hasMaterials = materials && materials.length > 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: "#f5f5f0" }}
      data-testid="ar-studio-overlay"
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-white/80 backdrop-blur-sm shadow-md hover:bg-white transition-colors"
        data-testid="button-close-ar-studio"
        aria-label="Close 3D Studio"
      >
        <X className="w-5 h-5 text-gray-700" />
      </button>

      {/* model-viewer wrapper — takes all space, never shrinks */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        <model-viewer
          ref={modelViewerRef}
          src={product.arLink}
          alt={`3D model of ${product.name}`}
          camera-controls
          ar
          ar-modes="scene-viewer quick-look webxr"
          xr-environment
          auto-rotate
          shadow-intensity="1"
          environment-image="neutral"
          exposure="1"
          style={{
            width: "100%",
            height: "100%",
            background: "transparent",
          }}
        />

        {/* Sliding sidebar — overlays the model */}
        {hasMaterials && (
          <>
            {/* Toggle button — always visible at right edge */}
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="absolute top-1/2 -translate-y-1/2 z-10 w-10 h-14 flex items-center justify-center rounded-l-xl shadow-lg transition-all duration-300"
              style={{
                right: sidebarOpen ? "min(176px, 40vw)" : 0,
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
              }}
              data-testid="button-toggle-material-sidebar"
              aria-label={sidebarOpen ? "Close material panel" : "Open material panel"}
            >
              {sidebarOpen ? (
                <ChevronRight className="w-5 h-5 text-white" />
              ) : (
                <ChevronLeft className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Sidebar panel */}
            <div
              className="absolute top-0 bottom-0 right-0 z-10 flex flex-col transition-transform duration-300"
              style={{
                width: "min(176px, 40vw)",
                transform: sidebarOpen ? "translateX(0)" : "translateX(min(176px, 40vw))",
                background: "rgba(0,0,0,0.65)",
                backdropFilter: "blur(16px)",
                WebkitBackdropFilter: "blur(16px)",
                borderLeft: "1px solid rgba(255,255,255,0.1)",
              }}
              data-testid="panel-material-sidebar"
            >
              <div className="px-3 pt-4 pb-2 shrink-0">
                <p className="text-[10px] uppercase tracking-widest text-white/60 font-semibold">
                  Finish
                </p>
              </div>

              <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-2">
                {/* Default card */}
                <button
                  onClick={resetToDefault}
                  data-testid="button-material-default"
                  className={cn(
                    "w-full rounded-xl p-2 flex flex-col items-center gap-1.5 transition-all duration-150 border",
                    activeMaterialId === null
                      ? "border-white/60 bg-white/15"
                      : "border-transparent bg-white/5 hover:bg-white/10"
                  )}
                >
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center">
                    <span className="text-white/80 text-xs font-medium">GLB</span>
                  </div>
                  <span className="text-[11px] text-white/80 font-medium leading-tight text-center">Default</span>
                </button>

                {/* Material cards */}
                {materials.map((mat) => (
                  <button
                    key={mat.id}
                    onClick={() => applyMaterialById(mat)}
                    data-testid={`button-material-card-${mat.id}`}
                    className={cn(
                      "w-full rounded-xl p-2 flex flex-col items-center gap-1.5 transition-all duration-150 border",
                      activeMaterialId === mat.id
                        ? "border-white/60 bg-white/15"
                        : "border-transparent bg-white/5 hover:bg-white/10"
                    )}
                  >
                    {mat.textureUrl ? (
                      <img
                        src={mat.textureUrl}
                        alt={mat.name}
                        className="w-12 h-12 rounded-lg object-cover border border-white/20"
                      />
                    ) : (
                      <div
                        className="w-12 h-12 rounded-full border-2 border-white/30 shadow-inner"
                        style={{ backgroundColor: mat.colorHex }}
                      />
                    )}
                    <span className="text-[11px] text-white/80 font-medium leading-tight text-center line-clamp-2">
                      {mat.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Bottom info bar */}
      <div
        className="flex items-center justify-between px-5 py-4 gap-4 shrink-0"
        style={{
          background: "rgba(255,255,255,0.6)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderTop: "1px solid rgba(255,255,255,0.7)",
        }}
        data-testid="panel-product-info"
      >
        <div className="min-w-0">
          <p
            className="font-serif font-semibold text-gray-900 truncate text-base sm:text-lg"
            data-testid="text-product-name"
          >
            {product.name}
          </p>
          <p
            className="text-sm text-gray-600 font-medium"
            data-testid="text-product-price"
          >
            ${Math.round(product.price / 100).toLocaleString()}
          </p>
        </div>
        <Button
          onClick={launchAR}
          disabled={!modelLoaded}
          size="lg"
          className="shrink-0 gap-2 rounded-full px-6 shadow-lg"
          data-testid="button-view-in-ar"
        >
          <Box className="w-4 h-4" />
          {modelLoaded ? "View in AR" : "Loading…"}
        </Button>
      </div>
    </div>
  );
}
