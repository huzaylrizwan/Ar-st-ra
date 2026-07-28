export interface ARCapability {
  isMobile: boolean;
  arSupported: boolean;
}

/**
 * Mirrors @google/model-viewer's own AR-mode selection (src/features/ar.ts,
 * src/constants.ts): Android is treated as AR-capable via the deterministic
 * Scene Viewer user-agent check, not solely via the flaky async
 * navigator.xr.isSessionSupported probe. That probe can transiently resolve
 * false on the same device/browser depending on ARCore init timing, so it's
 * kept only as an additional OR signal, never the sole basis for Android.
 */
export function detectARCapability(
  userAgent: string,
  hasQuickLookAnchor: boolean,
  webxrSupported: boolean
): ARCapability {
  const isAndroid = /android/i.test(userAgent);
  const isFirefox = /firefox/i.test(userAgent);
  const isOculus = /OculusBrowser/i.test(userAgent);
  const isIOS = /iPad|iPhone|iPod/i.test(userAgent);

  const sceneViewerCandidate = isAndroid && !isFirefox && !isOculus;

  return {
    isMobile: isAndroid || isIOS,
    arSupported: sceneViewerCandidate || hasQuickLookAnchor || webxrSupported,
  };
}
