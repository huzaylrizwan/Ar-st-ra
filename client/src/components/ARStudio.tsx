import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Product, ProductMaterial } from "@shared/schema";
import type { ModelViewerElement } from "@google/model-viewer";
import "@google/model-viewer";

interface ARStudioProps {
  product: Product;
  onClose: () => void;
}

export function ARStudio({ product, onClose }: ARStudioProps) {
  const modelViewerRef = useRef<ModelViewerElement>(null);
  const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);
  const [isApplyingTexture, setIsApplyingTexture] = useState(false);

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

  const applyMaterial = async (material: ProductMaterial) => {
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
        const texture = await mv.createTexture(material.textureUrl);
        if (texture && pbr.baseColorTexture) {
          pbr.baseColorTexture.setTexture(texture);
        }
      } else {
        pbr.setBaseColorFactor(material.colorHex);
      }
    } catch (err) {
      console.error("Failed to apply material:", err);
    } finally {
      setIsApplyingTexture(false);
    }
  };

  const launchAR = () => {
    const mv = modelViewerRef.current;
    if (mv) {
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
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center bg-white/80 backdrop-blur-sm shadow-md hover:bg-white transition-colors"
        data-testid="button-close-ar-studio"
        aria-label="Close 3D Studio"
      >
        <X className="w-5 h-5 text-gray-700" />
      </button>

      {/* model-viewer wrapper */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        <model-viewer
          ref={modelViewerRef}
          src={product.arLink}
          alt={`3D model of ${product.name}`}
          camera-controls
          ar
          ar-modes="scene-viewer quick-look"
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

        {/* Floating material swatches — horizontal bar centred at bottom of viewer */}
        {hasMaterials && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 px-4 py-3 rounded-2xl shadow-2xl"
            style={{
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.85)",
            }}
            data-testid="panel-material-swatches"
          >
            <span className="text-[10px] uppercase tracking-widest text-gray-500 font-semibold mr-2 whitespace-nowrap">
              Finish
            </span>
            {materials.map((mat) => (
              <button
                key={mat.id}
                onClick={() => applyMaterial(mat)}
                title={mat.name}
                data-testid={`swatch-material-${mat.id}`}
                className={cn(
                  "w-9 h-9 rounded-full transition-all duration-150 shrink-0",
                  activeMaterialId === mat.id
                    ? "ring-2 ring-offset-2 ring-gray-800 scale-110 shadow-lg"
                    : "ring-1 ring-white hover:scale-110 hover:shadow-md shadow-sm"
                )}
                style={{ backgroundColor: mat.colorHex }}
              />
            ))}
          </div>
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
          size="lg"
          className="shrink-0 gap-2 rounded-full px-6 shadow-lg"
          data-testid="button-view-in-ar"
        >
          <Box className="w-4 h-4" />
          View in AR
        </Button>
      </div>
    </div>
  );
}
