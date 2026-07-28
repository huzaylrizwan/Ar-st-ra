export interface ARCapability {
  isMobile: boolean;
  arSupported: boolean;
  isInAppBrowser: boolean;
  inAppBrowserName: string | null;
}

const IN_APP_BROWSERS: Array<{ name: string; pattern: RegExp }> = [
  { name: "LinkedIn", pattern: /LinkedInApp/i },
  { name: "Instagram", pattern: /Instagram/i },
  { name: "Facebook", pattern: /FBAN|FBAV|FB_IAB/i },
  { name: "Twitter", pattern: /Twitter/i },
  { name: "TikTok", pattern: /BytedanceWebview|TikTok/i },
  { name: "WeChat", pattern: /MicroMessenger/i },
  { name: "Line", pattern: /\bLine\//i },
  { name: "Snapchat", pattern: /Snapchat/i },
  { name: "WhatsApp", pattern: /WhatsApp/i },
];

function detectInAppBrowser(userAgent: string): string | null {
  const match = IN_APP_BROWSERS.find(({ pattern }) => pattern.test(userAgent));
  return match?.name ?? null;
}

/**
 * Mirrors @google/model-viewer's own AR-mode selection (src/features/ar.ts,
 * src/constants.ts): Android is treated as AR-capable via the deterministic
 * Scene Viewer user-agent check, not solely via the flaky async
 * navigator.xr.isSessionSupported probe. That probe can transiently resolve
 * false on the same device/browser depending on ARCore init timing, so it's
 * kept only as an additional OR signal, never the sole basis for Android.
 *
 * In-app browsers (LinkedIn, Instagram, Facebook, etc.) embed a restricted
 * WebView that blocks camera/AR access at the OS level — no client-side
 * check can work around that, so any detected in-app browser forces
 * arSupported to false regardless of what the UA otherwise looks like.
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
  const inAppBrowserName = detectInAppBrowser(userAgent);

  return {
    isMobile: isAndroid || isIOS,
    arSupported:
      !inAppBrowserName &&
      (sceneViewerCandidate || hasQuickLookAnchor || webxrSupported),
    isInAppBrowser: inAppBrowserName !== null,
    inAppBrowserName,
  };
}
