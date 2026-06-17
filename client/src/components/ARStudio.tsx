import { useEffect, useRef, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Box, Ruler, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Product, ProductMaterial, ProductModel, ProductMeasurement, ThemeSettings } from "@shared/schema";
import type { ModelViewerElement } from "@google/model-viewer";
import type { Texture as MVTexture } from "@google/model-viewer/lib/features/scene-graph/texture";
import { useAuth } from "@/hooks/use-auth";
import { fetchWithCsrf } from "@/lib/queryClient";
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

export function ARStudio({ product, onClose }: ARStudioProps) {
  const modelViewerRef = useRef<ModelViewerElement>(null);
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  const { data: studioSettings } = useQuery<ThemeSettings>({
    queryKey: ["/api/settings"],
    queryFn: async () => {
      const res = await fetchWithCsrf("/api/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
    staleTime: 1000 * 60 * 5,
  });


  // Studio appearance — from DB (fall back to 0.65 / #000000)
  const dbSidebarOpacity   = studioSettings?.studioSidebarOpacity   ?? 0.65;
  const dbSidebarColor     = studioSettings?.studioSidebarColor     ?? "#000000";
  const dbBottomBarOpacity = studioSettings?.studioBottomBarOpacity ?? 0.65;
  const dbBottomBarColor   = studioSettings?.studioBottomBarColor   ?? "#000000";

  const [bottomBarOpacity, setBottomBarOpacity] = useState<number>(0.65);
  const [bottomBarColor,   setBottomBarColor]   = useState<string>("#000000");
  const [sidebarOpacity,   setSidebarOpacity]   = useState<number>(0.65);
  const [sidebarColor,     setSidebarColor]     = useState<string>("#000000");

  // Sync local state from DB values when settings load
  useEffect(() => {
    if (studioSettings) {
      setBottomBarOpacity(studioSettings.studioBottomBarOpacity ?? 0.65);
      setBottomBarColor(studioSettings.studioBottomBarColor ?? "#000000");
      setSidebarOpacity(studioSettings.studioSidebarOpacity ?? 0.65);
      setSidebarColor(studioSettings.studioSidebarColor ?? "#000000");
    }
  }, [studioSettings]);

  // Mutation to persist studio settings back to DB
  const settingsMutation = useMutation({
    mutationFn: async (updates: Partial<ThemeSettings>) => {
      const res = await fetchWithCsrf("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error("Failed to update settings");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
    },
  });

  // Debounce helper — accumulates all field changes within 500ms window then sends one PUT
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSettingsRef = useRef<Partial<ThemeSettings>>({});
  const debouncedSaveSettings = useCallback((updates: Partial<ThemeSettings>) => {
    pendingSettingsRef.current = { ...pendingSettingsRef.current, ...updates };
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      settingsMutation.mutate(pendingSettingsRef.current);
      pendingSettingsRef.current = {};
    }, 500);
  }, [settingsMutation]);

  const updateBottomBarOpacity = (v: number) => {
    setBottomBarOpacity(v);
    debouncedSaveSettings({ studioBottomBarOpacity: v });
  };
  const updateBottomBarColor = (v: string) => {
    setBottomBarColor(v);
    debouncedSaveSettings({ studioBottomBarColor: v });
  };
  const updateSidebarOpacity = (v: number) => {
    setSidebarOpacity(v);
    debouncedSaveSettings({ studioSidebarOpacity: v });
  };
  const updateSidebarColor = (v: string) => {
    setSidebarColor(v);
    debouncedSaveSettings({ studioSidebarColor: v });
  };

  const { data: productModels } = useQuery<ProductModel[]>({
    queryKey: ["/api/products", product.id, "models"],
    queryFn: async () => {
      const res = await fetchWithCsrf(`/api/products/${product.id}/models`);
      if (!res.ok) throw new Error("Failed to fetch models");
      return res.json();
    },
  });

  // Track selected model — materials are fetched per selected model
  const [activeModelId, setActiveModelId] = useState<number | null>(null);

  // Fetch materials only for the active model (or empty if none selected)
  const { data: materials } = useQuery<ProductMaterial[]>({
    queryKey: ["/api/products", product.id, "models", activeModelId, "materials"],
    queryFn: async () => {
      if (activeModelId === null) return [];
      const res = await fetchWithCsrf(
        `/api/products/${product.id}/models/${activeModelId}/materials`
      );
      if (!res.ok) throw new Error("Failed to fetch materials");
      return res.json();
    },
    enabled: activeModelId !== null,
  });

  const { data: measurements } = useQuery<ProductMeasurement[]>({
    queryKey: ["/api/products", product.id, "measurements"],
    queryFn: async () => {
      const res = await fetchWithCsrf(`/api/products/${product.id}/measurements`);
      if (!res.ok) throw new Error("Failed to fetch measurements");
      return res.json();
    },
  });

  const getDefaultModelSrc = useCallback((models: ProductModel[] | undefined): string => {
    if (models && models.length > 0) {
      const defaultModel = models.find(m => m.isDefault) ?? models[0];
      return toAbsoluteUrl(defaultModel.modelUrl);
    }
    return toAbsoluteUrl(product.arLink);
  }, [product.arLink]);

  const [activeMaterialId, setActiveMaterialId] = useState<number | null>(null);
  const [isApplyingTexture, setIsApplyingTexture] = useState(false);
  const [isSwappingModel, setIsSwappingModel] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [measurementsOpen, setMeasurementsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const parseRgb = (hex: string) => ({
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  });

  const dynamicBottomBarStyle = (() => {
    const { r, g, b } = parseRgb(bottomBarColor);
    return {
      background: `rgba(${r},${g},${b},${bottomBarOpacity})`,
      backdropFilter: "blur(24px)",
      WebkitBackdropFilter: "blur(24px)",
    } as const;
  })();

  const glassStyle = {
    background: `rgba(0,0,0,0.65)`,
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
  } as const;

  const [currentModelSrc, setCurrentModelSrc] = useState<string>(toAbsoluteUrl(product.arLink));
  const currentModelSrcRef = useRef<string>(toAbsoluteUrl(product.arLink));

  const updateModelSrc = useCallback((newSrc: string) => {
    currentModelSrcRef.current = newSrc;
    setCurrentModelSrc(newSrc);
    setLoadProgress(0); // reset progress for new model
  }, []);

  const originalMaterialRef = useRef<{
    colorFactor: number[] | null;
    originalTexture: MVTexture | null;
  } | null>(null);

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

  useEffect(() => {
    if (!measurementsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-measurements-panel]")) setMeasurementsOpen(false);
    };
    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [measurementsOpen]);

  useEffect(() => {
    if (!settingsOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest("[data-settings-panel]")) setSettingsOpen(false);
    };
    document.addEventListener("click", handleClick, { capture: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [settingsOpen]);

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
    const slotIndex = material.materialSlotIndex ?? 0;
    const mat = model.materials[slotIndex];
    if (!mat) return;
    const pbr = mat.pbrMetallicRoughness;

    if (material.textureUrl) {
      if (pbr.baseColorTexture) {
        const texture = await mv.createTexture(toAbsoluteUrl(material.textureUrl));
        if (texture) {
          pbr.baseColorTexture.setTexture(texture);
          const scale = material.uvScale ?? 8;
          texture.sampler.setScale({ u: scale, v: scale });
          pbr.setBaseColorFactor([1, 1, 1, 1]);
        }
      } else {
        pbr.setBaseColorFactor(hexToRgba(material.colorHex));
      }
    } else {
      if (pbr.baseColorTexture) pbr.baseColorTexture.setTexture(null);
      pbr.setBaseColorFactor(hexToRgba(material.colorHex));
    }
  }, []);

  const applyMaterialById = useCallback(async (material: ProductMaterial) => {
    if (isApplyingTexture || isSwappingModel) return;
    setActiveMaterialId(material.id);

    if (material.variantModelUrl) {
      const newSrc = toAbsoluteUrl(material.variantModelUrl);
      if (newSrc !== currentModelSrcRef.current) {
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

  const resetToDefault = useCallback(async () => {
    setActiveMaterialId(null);
    const defaultSrc = getDefaultModelSrc(productModels);

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

    const mv = modelViewerRef.current;
    if (!mv) return;
    const orig = originalMaterialRef.current;
    if (!orig) return;
    const model = mv.model;
    if (!model || !model.materials || model.materials.length === 0) return;
    const mat = model.materials[0];
    const pbr = mat.pbrMetallicRoughness;
    if (orig.colorFactor) pbr.setBaseColorFactor(orig.colorFactor as [number, number, number, number]);
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

    const handleModelError = () => {
      setModelLoaded(true); // unblock UI
      setIsSwappingModel(false);
    };

    const handleLoad = async () => {
      setModelLoaded(true);
      setIsSwappingModel(false);
      captureOriginalMaterial();

      const mats = materialsRef.current;
      const currentActiveId = activeMaterialIdRef.current;

      if (currentActiveId !== null && mats) {
        const activeMat = mats.find(m => m.id === currentActiveId);
        if (activeMat && !activeMat.variantModelUrl) {
          try { await applyTextureOrColor(activeMat); } catch (err) { console.error(err); }
        }
        return;
      }

      if (activeModelIdRef.current !== null) return;

      if (mats) {
        const defaultMat = mats.find(m => m.isDefault);
        if (defaultMat) {
          if (defaultMat.variantModelUrl) {
            const newSrc = toAbsoluteUrl(defaultMat.variantModelUrl);
            setActiveMaterialId(defaultMat.id);
            if (newSrc !== currentModelSrcRef.current) {
              setIsSwappingModel(true);
              setModelLoaded(false);
              originalMaterialRef.current = null;
              updateModelSrc(newSrc);
            }
          } else {
            try { setActiveMaterialId(defaultMat.id); await applyTextureOrColor(defaultMat); } catch (err) { console.error(err); }
          }
        }
      }
    };

    const handleProgress = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.totalProgress !== undefined) {
        setLoadProgress(detail.totalProgress);
      }
    };

    mv.addEventListener("load", handleLoad);
    mv.addEventListener("progress", handleProgress);
    mv.addEventListener("error", handleModelError);
    return () => {
      mv.removeEventListener("load", handleLoad);
      mv.removeEventListener("progress", handleProgress);
      mv.removeEventListener("error", handleModelError);
    };
  }, [captureOriginalMaterial, applyTextureOrColor, updateModelSrc]);

  useEffect(() => {
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
    if (mv && modelLoaded) mv.activateAR();
  };

  const hasMeasurements = measurements && measurements.length > 0;

  const currencySymbol = studioSettings?.currencySymbol ?? "$";

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

      {/* Settings gear — admin only */}
      {isAuthenticated && (
        <div
          className="absolute top-4 z-20 flex flex-col items-end gap-2"
          style={{ right: "3.5rem" }}
          data-settings-panel
        >
          <button
            onClick={(e) => { e.stopPropagation(); setSettingsOpen(prev => !prev); }}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-all duration-150",
              settingsOpen ? "bg-white/30 text-white" : "bg-white/80 text-gray-700 hover:bg-white"
            )}
            data-testid="button-settings-gear"
            aria-label="Studio settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          <div
            className={cn(
              "rounded-2xl overflow-hidden transition-all duration-250 origin-top-right",
              settingsOpen ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none"
            )}
            style={{
              ...glassStyle,
              border: "1px solid rgba(255,255,255,0.15)",
              width: "min(240px, 72vw)",
            }}
            data-testid="panel-settings"
          >
            <div className="px-4 pt-3 pb-1">
              <p className="text-[9px] uppercase tracking-widest text-white/50 font-semibold">Studio Settings</p>
            </div>
            <div className="px-4 pb-4 space-y-4">
              <div className="space-y-2.5">
                <p className="text-[9px] uppercase tracking-widest text-white/40 font-semibold pt-1">Bottom Bar</p>
                <div className="flex items-center gap-3">
                  <label className="text-[11px] text-white/70 w-14 shrink-0">Opacity</label>
                  <input type="range" min={0} max={1} step={0.01} value={bottomBarOpacity}
                    onChange={(e) => updateBottomBarOpacity(parseFloat(e.target.value))}
                    className="flex-1 accent-yellow-500 h-1.5 rounded-full" data-testid="slider-bottom-bar-opacity" />
                  <span className="text-[10px] text-white/50 w-8 text-right shrink-0">{Math.round(bottomBarOpacity * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[11px] text-white/70 w-14 shrink-0">Colour</label>
                  <input type="color" value={bottomBarColor} onChange={(e) => updateBottomBarColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-white/20 bg-transparent" style={{ padding: "2px" }} data-testid="color-bottom-bar" />
                  <span className="text-[10px] text-white/40 font-mono">{bottomBarColor}</span>
                </div>
              </div>
              <div className="space-y-2.5">
                <p className="text-[9px] uppercase tracking-widest text-white/40 font-semibold pt-1">Sidebar</p>
                <div className="flex items-center gap-3">
                  <label className="text-[11px] text-white/70 w-14 shrink-0">Opacity</label>
                  <input type="range" min={0} max={1} step={0.01} value={sidebarOpacity}
                    onChange={(e) => updateSidebarOpacity(parseFloat(e.target.value))}
                    className="flex-1 accent-yellow-500 h-1.5 rounded-full" data-testid="slider-sidebar-opacity" />
                  <span className="text-[10px] text-white/50 w-8 text-right shrink-0">{Math.round(sidebarOpacity * 100)}%</span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-[11px] text-white/70 w-14 shrink-0">Colour</label>
                  <input type="color" value={sidebarColor} onChange={(e) => updateSidebarColor(e.target.value)}
                    className="w-8 h-8 rounded cursor-pointer border border-white/20 bg-transparent" style={{ padding: "2px" }} data-testid="color-sidebar" />
                  <span className="text-[10px] text-white/40 font-mono">{sidebarColor}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

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

        {/* AR loading progress bar */}
        {(!modelLoaded || isSwappingModel) && (
          <div
            className="absolute top-0 left-0 h-[3px] z-20 transition-all duration-200 pointer-events-none"
            style={{
              width: `${Math.round(loadProgress * 100)}%`,
              background: "linear-gradient(90deg, #c8a84b, #e8c96a)",
            }}
          />
        )}

        {/* Measurements button + panel (bottom-left) */}
        {hasMeasurements && (
          <div className="absolute bottom-4 left-4 z-10 flex flex-col items-start gap-2" data-measurements-panel>
            <div
              className={cn(
                "mb-1 rounded-2xl overflow-hidden transition-all duration-300 origin-bottom-left",
                measurementsOpen ? "opacity-100 scale-100 pointer-events-auto translate-y-0" : "opacity-0 scale-95 pointer-events-none translate-y-2"
              )}
              style={{ ...glassStyle, border: "1px solid rgba(255,255,255,0.12)", width: "min(220px, 55vw)", maxHeight: "260px" }}
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
            <button
              onClick={(e) => { e.stopPropagation(); setMeasurementsOpen(prev => !prev); }}
              className={cn("w-10 h-10 rounded-full flex items-center justify-center shadow-lg transition-all duration-150",
                measurementsOpen ? "bg-white/25" : "bg-white/10 hover:bg-white/20")}
              style={{ ...glassStyle, border: "1px solid rgba(255,255,255,0.18)" }}
              data-testid="button-measurements-toggle"
              aria-label="Toggle measurements"
            >
              <Ruler className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

      </div>

      {/* Frosted glass bottom bar */}
      <div
        className="flex items-center justify-between px-5 py-4 gap-4 shrink-0"
        style={{ ...dynamicBottomBarStyle, borderTop: "1px solid rgba(255,255,255,0.14)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.18)" }}
        data-testid="panel-product-info"
      >
        <div className="min-w-0">
          <p className="font-serif font-semibold text-white truncate text-base sm:text-lg" data-testid="text-product-name">
            {product.name}
          </p>
          <p className="text-sm text-white/60 font-medium" data-testid="text-product-price">
            {currencySymbol}{Math.round(product.price / 100).toLocaleString()}
          </p>
        </div>
        <button
          onClick={launchAR}
          disabled={!modelLoaded || isSwappingModel}
          data-testid="button-view-in-ar"
          className="shrink-0 flex items-center gap-2 px-6 py-2.5 rounded-full font-semibold text-sm transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "linear-gradient(135deg, #c8a84b 0%, #e8c96a 45%, #b8922e 100%)",
            border: "1px solid rgba(232,201,106,0.5)",
            color: "#1a1000",
            boxShadow: "0 2px 16px rgba(184,146,46,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
          }}
        >
          <Box className="w-4 h-4" />
          {modelLoaded && !isSwappingModel
            ? "View in AR"
            : `Loading… ${Math.round(loadProgress * 100)}%`}
        </button>
      </div>
    </div>
  );
}

// ── Extracted MaterialCard sub-component ──
function MaterialCard({
  mat, activeMaterialId, onApply, isApplyingTexture, isSwappingModel, cardStyle, toAbsoluteUrl,
}: {
  mat: ProductMaterial;
  activeMaterialId: number | null;
  onApply: (m: ProductMaterial) => void;
  isApplyingTexture: boolean;
  isSwappingModel: boolean;
  cardStyle: (active: boolean) => React.CSSProperties;
  toAbsoluteUrl: (p: string) => string;
}) {
  const isActive = activeMaterialId === mat.id;
  return (
    <button
      key={mat.id}
      onClick={() => onApply(mat)}
      data-testid={`button-material-card-${mat.id}`}
      disabled={isApplyingTexture || isSwappingModel}
      className={cn(
        "w-full p-2 flex flex-col items-center gap-1.5 transition-all duration-150",
        isActive ? "bg-white/10" : "bg-white/5 hover:bg-white/10",
        (isApplyingTexture || isSwappingModel) && "opacity-60 cursor-not-allowed"
      )}
      style={cardStyle(isActive)}
    >
      {mat.textureUrl ? (
        <img src={toAbsoluteUrl(mat.textureUrl)} alt={mat.name}
          className="w-12 h-12 object-cover border border-white/20" style={{ borderRadius: "10px" }} />
      ) : mat.variantModelUrl ? (
        <div className="w-12 h-12 bg-gradient-to-br from-white/20 to-white/5 border border-white/20 flex items-center justify-center" style={{ borderRadius: "10px" }}>
          <Box className="w-5 h-5 text-white/70" />
        </div>
      ) : (
        <div className="flex items-center justify-center w-12 h-12">
          <div className="border-2 border-white/30 shadow-inner"
            style={{ width: "16px", height: "16px", borderRadius: "50%", backgroundColor: mat.colorHex }} />
        </div>
      )}
      <span className="text-[11px] text-white/80 font-medium leading-tight text-center line-clamp-2">{mat.name}</span>
    </button>
  );
}
