import { useEffect, useRef, useState } from "react";
import "@google/model-viewer";
import type { ProductMaterial } from "@shared/schema";

function toAbsoluteUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${window.location.origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

interface InlineModelViewerProps {
  modelUrl: string;
  materials: ProductMaterial[];
  activeMaterialId: number | null;
  className?: string;
}

export function InlineModelViewer({
  modelUrl,
  materials,
  activeMaterialId,
  className,
}: InlineModelViewerProps) {
  const viewerRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);

  // Reset loading state whenever the model URL changes (model switcher)
  const prevModelUrlRef = useRef(modelUrl);
  useEffect(() => {
    if (modelUrl !== prevModelUrlRef.current) {
      prevModelUrlRef.current = modelUrl;
      setIsLoaded(false);
      setLoadError(false);
    }
  }, [modelUrl]);

  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer) return;

    // If the model is already loaded (race condition: cached model fires 'load' before effect runs)
    if ((viewer as any).loaded || (viewer as any).model) {
      setIsLoaded(true);
      return;
    }

    const handleLoad = () => { setIsLoaded(true); setLoadError(false); };
    const handleError = () => { setIsLoaded(true); setLoadError(true); };
    viewer.addEventListener("load", handleLoad);
    viewer.addEventListener("error", handleError);
    return () => {
      viewer.removeEventListener("load", handleLoad);
      viewer.removeEventListener("error", handleError);
    };
  }, []);

  // Apply material when viewer loads or activeMaterialId changes
  useEffect(() => {
    if (!isLoaded || !viewerRef.current || !activeMaterialId) return;
    const activeMaterial = materials.find(m => m.id === activeMaterialId);
    if (!activeMaterial) return;

    const viewer = viewerRef.current;

    async function applyMaterial(material: ProductMaterial) {
      try {
        const model = viewer.model;
        if (!model) return;

        const slotIndex = material.materialSlotIndex ?? 0;
        const mat = model.materials[slotIndex];
        if (!mat) return;

        const pbr = mat.pbrMetallicRoughness;

        if (material.textureUrl) {
          // Issue 5 fix: resolve textureUrl to absolute URL (matches ARStudio.tsx pattern)
          const texture = await viewer.createTexture(toAbsoluteUrl(material.textureUrl));
          if (texture) {
            // Issue 3 fix: null guard on baseColorTexture before calling setTexture
            if (pbr.baseColorTexture) {
              pbr.baseColorTexture.setTexture(texture);
              // Issue 2 fix: use texture.sampler.setScale() instead of texture.transform.scale
              const uvScale = material.uvScale ?? 8;
              texture.sampler.setScale({ u: uvScale, v: uvScale });
              pbr.setBaseColorFactor([1, 1, 1, 1]);
            } else if (material.colorHex) {
              // fallback to color if no texture slot
              const hex = material.colorHex.replace("#", "");
              const r = parseInt(hex.substring(0, 2), 16) / 255;
              const g = parseInt(hex.substring(2, 4), 16) / 255;
              const b = parseInt(hex.substring(4, 6), 16) / 255;
              pbr.setBaseColorFactor([r, g, b, 1]);
            }
          }
        } else if (material.colorHex) {
          const hex = material.colorHex.replace("#", "");
          const r = parseInt(hex.substring(0, 2), 16) / 255;
          const g = parseInt(hex.substring(2, 4), 16) / 255;
          const b = parseInt(hex.substring(4, 6), 16) / 255;
          mat.pbrMetallicRoughness.setBaseColorFactor([r, g, b, 1]);
        }
      } catch (err) {
        console.warn("InlineModelViewer material apply failed:", err);
      }
    }

    applyMaterial(activeMaterial);
  }, [isLoaded, activeMaterialId, materials]);

  return (
    <div
      className={className}
      style={{ position: "relative", borderRadius: "var(--radius-card)", overflow: "hidden" }}
    >
      {/* Loading / error overlay */}
      {(!isLoaded || loadError) && (
        <div
          className="absolute inset-0 flex items-center justify-center z-10"
          style={{
            borderRadius: "var(--radius-card)",
            background: loadError ? "var(--surface-1)" : undefined,
          }}
        >
          {loadError ? (
            <div className="text-center px-4 space-y-1">
              <div className="text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                3D model unavailable
              </div>
              <div className="text-[10px]" style={{ color: "var(--text-secondary)", opacity: 0.6 }}>
                Re-upload the model file in admin
              </div>
            </div>
          ) : (
            <div className="skeleton-shimmer absolute inset-0" style={{ borderRadius: "var(--radius-card)" }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
                  Loading 3D Model…
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Issue 4 fix: removed onLoad prop — load event is wired via addEventListener in useEffect above */}
      <model-viewer
        ref={viewerRef}
        src={toAbsoluteUrl(modelUrl)}
        alt="3D product model"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        exposure="0.9"
        style={{
          width: "100%",
          height: "100%",
          background: "transparent",
          "--progress-bar-color": "var(--accent)",
        } as React.CSSProperties}
      />
    </div>
  );
}
