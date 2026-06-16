import { useEffect, useRef, useState } from "react";
import type { ProductMaterial } from "@shared/schema";

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

        if (material.textureUrl) {
          const texture = await viewer.createTexture(material.textureUrl);
          const uvScale = material.uvScale ?? 8;
          texture.transform.scale = { u: uvScale, v: uvScale };
          mat.pbrMetallicRoughness.baseColorTexture.setTexture(texture);
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
      {/* Loading overlay */}
      {!isLoaded && (
        <div
          className="absolute inset-0 skeleton-shimmer flex items-center justify-center z-10"
          style={{ borderRadius: "var(--radius-card)" }}
        >
          <div className="text-xs uppercase tracking-widest" style={{ color: "var(--text-secondary)" }}>
            Loading 3D Model…
          </div>
        </div>
      )}

      <model-viewer
        ref={viewerRef}
        src={modelUrl}
        alt="3D product model"
        camera-controls
        auto-rotate
        shadow-intensity="1"
        exposure="0.9"
        onLoad={() => setIsLoaded(true)}
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
