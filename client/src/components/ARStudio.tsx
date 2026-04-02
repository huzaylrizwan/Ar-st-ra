import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Box, ChevronLeft, ChevronRight, Loader2, Ruler } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product, ProductMaterial, ProductModel, ProductMeasurement } from "@shared/schema";
import type { ModelViewerElement } from "@google/model-viewer";
import type { Texture as MVTexture } from "@google/model-viewer/lib/features/scene-graph/texture";
import "@google/model-viewer";

interface ARStudioProps {
  product: Product;
  onClose: () => void;
}

function toAbsoluteUrl(path: string): string {
  if (!path) return path;
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${window.location.origin}${path.startsWith("/") ? "" : "/"}${path}`;
}

const glassStyle = {
  background: "rgba(0,0,0,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
} as const;

export function ARStudio({ product, onClose }: ARStudioProps) {
  const modelViewerRef = useRef<ModelViewerElement>(null);

  // Model configurations from productModels API
  const { data: productModels } = useQuery<ProductModel[]>({
    queryKey: ["/api/products", product.id, "models"],
    queryFn: async () => {
      const res = await fetch(`/api/products/${product.id}/models`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch models");
      return res.json();
    },
  });

  const { data: materials } = useQuery<ProductMaterial[]>({
    queryKey: ["/api/products", product.id, "materials"],
    queryFn: async () => {
      const res = await fetch(`/api/products/${product.id}/materials`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch materials");
      return res.json();
    },
  });

  const { data: measurements } = useQuery<ProductMeasurement[]>({
    queryKey: ["/api/products", product.id, "measurements"],
    queryFn: async () => {
      const res = await fetch(`/api/products/${product.id}/measurements`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch measurements");
      return res.json();
    },
  });

  // Derive default model source: prefer default productModel config, fallback to product.arLink
  const getDefaultModelSrc = useCallback((models: ProductModel[] | undefined): string => {
    if (models && models.length > 0) {
      const defaultModel = models.find(m => m.isDefault) ?? models[0];
      return toAbsoluteUrl(defaultModel.modelUrl);
    }
    return toAbsoluteUrl(product.arLink);
  }, [product.arLink]);

  const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);
  // activeModelId: null = no model config selected (using base arLink), or the id of selected model config
  const [activeModelId, setActiveModelId] = useState<number | null>(null);
  const [isApplyingTexture, setIsApplyingTexture] = useState(false);
  const [isSwappingModel, setIsSwappingModel] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [measurementsOpen, setMeasurementsOpen] = useState(false);

  // Initialize src from product.arLink; will be updated once productModels loads
  const [currentModelSrc, setCurrentModelSrc] = useState<string>(toAbsoluteUrl(product.arLink));
  const currentModelSrcRef = useRef<string>(toAbsoluteUrl(product.arLink));

  const updateModelSrc = useCallback((newSrc: string) => {
    currentModelSrcRef.current = newSrc;
    setCurrentModelSrc(newSrc);
  }, []);

  const originalMaterialRef = useRef<{
    colorFactor: number[] | null;
    originalTexture: MVTexture | null;
  } | null>(null);

  // When productModels data first loads, apply the default model config
  const modelsInitializedRef = useRef(false);
  useEffect(() => {
    if (modelsInitializedRef.current) return;
    if (!productModels) return;
    modelsInitializedRef.current = true;

    if (productModels.length > 0) {
      const defaultModel = productModels.find(m => m.isDefault) ?? productModels[0];
      const newSrc = toAbsoluteUrl(defaultModel.modelUrl);
      setActiveModelId(defaultModel.id);
      if (newSrc !== currentModelSrcRef.current) {
        setIsSwappingModel(true);
        setModelLoaded(false);
        originalMaterialRef.current = null;
        updateModelSrc(newSrc);
      }
    }
  }, [productModels, updateModelSrc]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Close measurements panel when clicking outside
  useEffect(() => {
    if (!measurementsOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-measurements-panel]")) {
        setMeasurementsOpen(false);
      }
    };
    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [measurementsOpen]);

  const captureOriginalMaterial = useCallback(() => {
    const mv = modelViewerRef.current;
    if (!mv) return;
    const model = mv.model;
    if (!model || !model.materials || model.materials.length === 0) return;
    const mat = model.materials[0];
    const pbr = mat.pbrMetallicRoughness;
    originalMaterialRef.current = {
      colorFactor: pbr.baseColorFactor ? [...pbr.baseColorFactor] : null,
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

  const applyTextureOrColor = useCallback(async (material: ProductMaterial) => {
    const mv = modelViewerRef.current;
    if (!mv) return;
    const model = mv.model;
    if (!model || !model.materials || model.materials.length === 0) return;
    const mat = model.materials[0];
    const pbr = mat.pbrMetallicRoughness;

    if (material.textureUrl) {
      if (pbr.baseColorTexture) {
        const texture = await mv.createTexture(toAbsoluteUrl(material.textureUrl));
        if (texture) {
          pbr.baseColorTexture.setTexture(texture);
          texture.sampler.setScale({ u: 8, v: 8 });
          pbr.setBaseColorFactor([1, 1, 1, 1]);
        }
      } else {
        pbr.setBaseColorFactor(hexToRgba(material.colorHex));
      }
    } else {
      if (pbr.baseColorTexture) {
        pbr.baseColorTexture.setTexture(null);
      }
      pbr.setBaseColorFactor(hexToRgba(material.colorHex));
    }
  }, []);

  const applyMaterialById = useCallback(async (material: ProductMaterial) => {
    if (isApplyingTexture || isSwappingModel) return;
    setActiveMaterialId(material.id);

    if (material.variantModelUrl) {
      const newSrc = toAbsoluteUrl(material.variantModelUrl);
      if (newSrc !== currentModelSrcRef.current) {
        // When applying a material variant model, clear the model-config selection
        setActiveModelId(null);
        setIsSwappingModel(true);
        setModelLoaded(false);
        originalMaterialRef.current = null;
        updateModelSrc(newSrc);
      }
      return;
    }

    const mv = modelViewerRef.current;
    if (!mv) return;
    setIsApplyingTexture(true);
    try {
      await applyTextureOrColor(material);
    } catch (err) {
      console.error("Failed to apply material:", err);
    } finally {
      setIsApplyingTexture(false);
    }
  }, [isApplyingTexture, isSwappingModel, updateModelSrc, applyTextureOrColor]);

  // Reset to default: uses the default model config if present, otherwise product.arLink
  const resetToDefault = useCallback(async () => {
    setActiveMaterialId(null);

    const defaultSrc = getDefaultModelSrc(productModels);

    // Update active model id to reflect the default model config selection
    if (productModels && productModels.length > 0) {
      const defaultModel = productModels.find(m => m.isDefault) ?? productModels[0];
      setActiveModelId(defaultModel.id);
    } else {
      setActiveModelId(null);
    }

    if (currentModelSrcRef.current !== defaultSrc) {
      setIsSwappingModel(true);
      setModelLoaded(false);
      originalMaterialRef.current = null;
      updateModelSrc(defaultSrc);
      return;
    }

    // Already on default model — just restore original material appearance
    const mv = modelViewerRef.current;
    if (!mv) return;
    const orig = originalMaterialRef.current;
    if (!orig) return;
    const model = mv.model;
    if (!model || !model.materials || model.materials.length === 0) return;
    const mat = model.materials[0];
    const pbr = mat.pbrMetallicRoughness;

    if (orig.colorFactor) {
      pbr.setBaseColorFactor(orig.colorFactor as [number, number, number, number]);
    }
    if (pbr.baseColorTexture) {
      if (orig.originalTexture) {
        pbr.baseColorTexture.setTexture(orig.originalTexture);
        orig.originalTexture.sampler.setScale(null);
      } else {
        pbr.baseColorTexture.setTexture(null);
      }
    }
  }, [productModels, getDefaultModelSrc, updateModelSrc]);

  const applyModelConfig = useCallback((modelConfig: ProductModel) => {
    if (isSwappingModel) return;
    setActiveModelId(modelConfig.id);
    setActiveMaterialId(null);
    const newSrc = toAbsoluteUrl(modelConfig.modelUrl);
    if (newSrc !== currentModelSrcRef.current) {
      setIsSwappingModel(true);
      setModelLoaded(false);
      originalMaterialRef.current = null;
      updateModelSrc(newSrc);
    }
  }, [isSwappingModel, updateModelSrc]);

  const materialsRef = useRef(materials);
  materialsRef.current = materials;

  const activeMaterialIdRef = useRef(activeMaterialId);
  activeMaterialIdRef.current = activeMaterialId;

  const activeModelIdRef = useRef(activeModelId);
  activeModelIdRef.current = activeModelId;

  useEffect(() => {
    const mv = modelViewerRef.current;
    if (!mv) return;

    const handleLoad = async () => {
      setModelLoaded(true);
      setIsSwappingModel(false);
      captureOriginalMaterial();

      const mats = materialsRef.current;
      const currentActiveId = activeMaterialIdRef.current;

      // If an active material is set, re-apply it (unless it has a variantModelUrl — that IS the model swap)
      if (currentActiveId !== null && mats) {
        const activeMat = mats.find(m => m.id === currentActiveId);
        if (activeMat && !activeMat.variantModelUrl) {
          try {
            await applyTextureOrColor(activeMat);
          } catch (err) {
            console.error("Failed to re-apply material after model swap:", err);
          }
        }
        return;
      }

      // If a model config is active (selected by user), don't auto-apply default material
      // to avoid overriding the user's model choice via a variantModelUrl
      if (activeModelIdRef.current !== null) {
        return;
      }

      // Auto-apply the default material on first load (only when no model config is selected)
      if (mats) {
        const defaultMat = mats.find(m => m.isDefault);
        if (defaultMat) {
          if (defaultMat.variantModelUrl) {
            // Only auto-swap the model via material default if no model config is active
            const newSrc = toAbsoluteUrl(defaultMat.variantModelUrl);
            setActiveMaterialId(defaultMat.id);
            if (newSrc !== currentModelSrcRef.current) {
              setIsSwappingModel(true);
              setModelLoaded(false);
              originalMaterialRef.current = null;
              updateModelSrc(newSrc);
            }
          } else {
            try {
              setActiveMaterialId(defaultMat.id);
              await applyTextureOrColor(defaultMat);
            } catch (err) {
              console.error("Failed to apply default material:", err);
            }
          }
        }
      }
    };

    mv.addEventListener("load", handleLoad);
    return () => mv.removeEventListener("load", handleLoad);
  }, [captureOriginalMaterial, applyTextureOrColor, updateModelSrc]);

  useEffect(() => {
    // Guard: don't auto-apply default material if a model config is actively selected
    if (modelLoaded && materials && activeMaterialId === null && activeModelId === null) {
      const defaultMat = materials.find(m => m.isDefault);
      if (defaultMat) {
        if (defaultMat.variantModelUrl) {
          const newSrc = toAbsoluteUrl(defaultMat.variantModelUrl);
          if (newSrc !== currentModelSrcRef.current) {
            setActiveMaterialId(defaultMat.id);
            setIsSwappingModel(true);
            setModelLoaded(false);
            originalMaterialRef.current = null;
            updateModelSrc(newSrc);
          } else {
            setActiveMaterialId(defaultMat.id);
          }
        } else {
          setActiveMaterialId(defaultMat.id);
          applyTextureOrColor(defaultMat).catch(console.error);
        }
      }
    }
  }, [materials, modelLoaded, activeModelId, updateModelSrc, applyTextureOrColor]);

  const launchAR = () => {
    const mv = modelViewerRef.current;
    if (mv && modelLoaded) {
      mv.activateAR();
    }
  };

  const hasMaterials = materials && materials.length > 0;
  const hasModelConfigs = productModels && productModels.length > 1;
  const hasMeasurements = measurements && measurements.length > 0;
  const showSidebar = hasMaterials || hasModelConfigs;

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

      {/* model-viewer wrapper */}
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", position: "relative" }}>
        <model-viewer
          ref={modelViewerRef}
          src={currentModelSrc}
          alt={`3D model of ${product.name}`}
          camera-controls
          ar
          ar-modes="scene-viewer quick-look webxr"
          ar-scale="fixed"
          xr-environment
          auto-rotate
          shadow-intensity="1"
          environment-image="neutral"
          exposure="1"
          style={{ width: "100%", height: "100%", background: "transparent" }}
        />

        {/* Model swap loading overlay */}
        {isSwappingModel && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-sm z-10 pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
              <span className="text-white/90 text-sm font-medium">Loading variant…</span>
            </div>
          </div>
        )}

        {/* Measurements button + panel (bottom-left) */}
        {hasMeasurements && (
          <div
            className="absolute bottom-4 left-4 z-10 flex flex-col items-start gap-2"
            data-measurements-panel
          >
            {/* Measurements panel */}
            <div
              className={cn(
                "mb-1 rounded-2xl overflow-hidden transition-all duration-300 origin-bottom-left",
                measurementsOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
              )}
              style={{
                ...glassStyle,
                border: "1px solid rgba(255,255,255,0.12)",
                width: "min(220px, 55vw)",
                maxHeight: "260px",
              }}
              data-testid="panel-measurements"
            >
              <div className="px-3 pt-3 pb-1 shrink-0">
                <p className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">Measurements</p>
              </div>
              <div className="overflow-y-auto px-3 pb-3" style={{ maxHeight: "210px" }}>
                {measurements!.map((m) => (
                  <div key={m.id} className="flex items-baseline justify-between py-1.5 border-b border-white/10 last:border-0 gap-2">
                    <span className="text-[12px] text-white/70 shrink-0">{m.label}</span>
                    <span className="text-[12px] text-white font-medium text-right">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Measurements toggle button */}
            <button
              onClick={(e) => { e.stopPropagation(); setMeasurementsOpen(prev => !prev); }}
              className={cn(
                "w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-150",
                measurementsOpen ? "bg-white/25" : "bg-white/10 hover:bg-white/20"
              )}
              style={{
                ...glassStyle,
                border: "1px solid rgba(255,255,255,0.18)",
              }}
              data-testid="button-measurements-toggle"
              aria-label="Toggle measurements"
            >
              <Ruler className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Unified sliding sidebar */}
        {showSidebar && (
          <>
            {/* Toggle button */}
            <button
              onClick={() => setSidebarOpen(prev => !prev)}
              className="absolute top-1/2 -translate-y-1/2 z-10 w-10 h-14 flex items-center justify-center rounded-l-xl shadow-lg transition-all duration-300"
              style={{
                right: sidebarOpen ? "min(176px, 40vw)" : 0,
                ...glassStyle,
                border: "1px solid rgba(255,255,255,0.1)",
                borderRight: "none",
              }}
              data-testid="button-toggle-material-sidebar"
              aria-label={sidebarOpen ? "Close panel" : "Open panel"}
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
                ...glassStyle,
                borderLeft: "1px solid rgba(255,255,255,0.1)",
              }}
              data-testid="panel-material-sidebar"
            >
              <div className="flex-1 overflow-y-auto pb-4">

                {/* Model section — only shown when >1 configuration */}
                {hasModelConfigs && (
                  <>
                    <div className="px-3 pt-4 pb-2 shrink-0">
                      <p className="text-[8px] uppercase tracking-widest text-white/50 font-semibold">Model</p>
                    </div>
                    <div className="px-2 space-y-2">
                      {productModels!.map((modelConfig) => (
                        <button
                          key={modelConfig.id}
                          onClick={() => applyModelConfig(modelConfig)}
                          data-testid={`button-model-card-${modelConfig.id}`}
                          disabled={isSwappingModel}
                          className={cn(
                            "w-full p-2 flex flex-col items-center gap-1.5 transition-all duration-150 border",
                            "disabled:opacity-60 disabled:cursor-not-allowed",
                            activeModelId === modelConfig.id
                              ? "border-white/70 bg-white/15"
                              : "border-transparent bg-white/5 hover:bg-white/10"
                          )}
                          style={{
                            borderRadius: "14px",
                            boxShadow: activeModelId === modelConfig.id ? "0 0 0 2px rgba(255,255,255,0.08)" : undefined,
                          }}
                        >
                          {modelConfig.thumbnailUrl ? (
                            <img
                              src={toAbsoluteUrl(modelConfig.thumbnailUrl)}
                              alt={modelConfig.name}
                              className="w-12 h-12 object-cover border border-white/20"
                              style={{ borderRadius: "10px" }}
                            />
                          ) : (
                            <div
                              className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center"
                              style={{ borderRadius: "10px" }}
                            >
                              <Box className="w-5 h-5 text-white/70" />
                            </div>
                          )}
                          <span className="text-[11px] text-white/80 font-medium leading-tight text-center line-clamp-2">
                            {modelConfig.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Divider between sections when both present */}
                {hasModelConfigs && hasMaterials && (
                  <div className="mx-3 my-3 border-t border-white/10" />
                )}

                {/* Finish section */}
                {hasMaterials && (
                  <>
                    <div className={cn("px-3 pb-2 shrink-0", !hasModelConfigs ? "pt-4" : "pt-0")}>
                      <p className="text-[8px] uppercase tracking-widest text-white/50 font-semibold">Finish</p>
                    </div>
                    <div className="px-2 space-y-2">
                      {/* Default card */}
                      <button
                        onClick={resetToDefault}
                        data-testid="button-material-default"
                        className={cn(
                          "w-full p-2 flex flex-col items-center gap-1.5 transition-all duration-150 border",
                          activeMaterialId === null
                            ? "border-white/70 bg-white/15"
                            : "border-transparent bg-white/5 hover:bg-white/10"
                        )}
                        style={{
                          borderRadius: "14px",
                          boxShadow: activeMaterialId === null ? "0 0 0 2px rgba(255,255,255,0.08)" : undefined,
                        }}
                      >
                        <div
                          className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center"
                          style={{ borderRadius: "10px" }}
                        >
                          <span className="text-white/80 text-xs font-medium">GLB</span>
                        </div>
                        <span className="text-[11px] text-white/80 font-medium leading-tight text-center">Default</span>
                      </button>

                      {/* Material cards */}
                      {materials!.map((mat) => (
                        <button
                          key={mat.id}
                          onClick={() => applyMaterialById(mat)}
                          data-testid={`button-material-card-${mat.id}`}
                          disabled={isApplyingTexture || isSwappingModel}
                          className={cn(
                            "w-full p-2 flex flex-col items-center gap-1.5 transition-all duration-150 border",
                            activeMaterialId === mat.id
                              ? "border-white/70 bg-white/15"
                              : "border-transparent bg-white/5 hover:bg-white/10",
                            (isApplyingTexture || isSwappingModel) && "opacity-60 cursor-not-allowed"
                          )}
                          style={{
                            borderRadius: "14px",
                            boxShadow: activeMaterialId === mat.id ? "0 0 0 2px rgba(255,255,255,0.08)" : undefined,
                          }}
                        >
                          {/* PNG texture takes priority, then box icon for GLB-only, then color circle */}
                          {mat.textureUrl ? (
                            <img
                              src={toAbsoluteUrl(mat.textureUrl)}
                              alt={mat.name}
                              className="w-12 h-12 object-cover border border-white/20"
                              style={{ borderRadius: "10px" }}
                            />
                          ) : mat.variantModelUrl ? (
                            <div
                              className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center"
                              style={{ borderRadius: "10px" }}
                            >
                              <Box className="w-5 h-5 text-white/70" />
                            </div>
                          ) : (
                            <div
                              className="flex items-center justify-center w-12 h-12"
                            >
                              <div
                                className="border-2 border-white/30 shadow-inner"
                                style={{
                                  width: "16px",
                                  height: "16px",
                                  borderRadius: "50%",
                                  backgroundColor: mat.colorHex,
                                }}
                              />
                            </div>
                          )}
                          <span className="text-[11px] text-white/80 font-medium leading-tight text-center line-clamp-2">
                            {mat.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Frosted glass bottom bar */}
      <div
        className="flex items-center justify-between px-5 py-4 gap-4 shrink-0"
        style={{
          background: "rgba(255,255,255,0.12)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderTop: "1px solid rgba(255,255,255,0.18)",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22)",
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
            className="text-sm text-gray-500 font-medium"
            data-testid="text-product-price"
          >
            ${Math.round(product.price / 100).toLocaleString()}
          </p>
        </div>
        <button
          onClick={launchAR}
          disabled={!modelLoaded || isSwappingModel}
          data-testid="button-view-in-ar"
          className="shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "rgba(255,255,255,0.55)",
            border: "1px solid rgba(255,255,255,0.75)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            color: "#1a1a1a",
            boxShadow: "0 2px 12px rgba(0,0,0,0.08)",
          }}
        >
          <Box className="w-4 h-4" />
          {modelLoaded && !isSwappingModel ? "View in AR" : "Loading…"}
        </button>
      </div>
    </div>
  );
}
