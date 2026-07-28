import { describe, it, expect } from "vitest";
import { detectARCapability } from "@/lib/ar-capability";

const ANDROID_CHROME =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36";
const ANDROID_FIREFOX =
  "Mozilla/5.0 (Android 14; Mobile; rv:126.0) Gecko/126.0 Firefox/126.0";
const IOS_SAFARI =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";
const IOS_WHATSAPP =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/WhatsApp;FBAV/2.24]";
const DESKTOP_CHROME =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const ANDROID_LINKEDIN =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/126.0.0.0 Mobile Safari/537.36 LinkedInApp/9.28.7401";
const IOS_LINKEDIN =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 LinkedInApp/9.28.7401";
const ANDROID_INSTAGRAM =
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 Instagram 302.0.0.23.114";

describe("detectARCapability", () => {
  it("treats Android Chrome as AR-capable even when the flaky webxr probe says no", () => {
    const result = detectARCapability(ANDROID_CHROME, false, false);
    expect(result.isMobile).toBe(true);
    expect(result.arSupported).toBe(true);
  });

  it("treats Android Chrome as AR-capable when the webxr probe says yes too", () => {
    const result = detectARCapability(ANDROID_CHROME, false, true);
    expect(result.isMobile).toBe(true);
    expect(result.arSupported).toBe(true);
  });

  it("does not use the deterministic scene-viewer fallback for Android Firefox", () => {
    const withoutWebxr = detectARCapability(ANDROID_FIREFOX, false, false);
    expect(withoutWebxr.isMobile).toBe(true);
    expect(withoutWebxr.arSupported).toBe(false);

    const withWebxr = detectARCapability(ANDROID_FIREFOX, false, true);
    expect(withWebxr.arSupported).toBe(true);
  });

  it("treats iOS Safari with Quick Look anchor support as AR-capable", () => {
    const result = detectARCapability(IOS_SAFARI, true, false);
    expect(result.isMobile).toBe(true);
    expect(result.arSupported).toBe(true);
  });

  it("treats iOS in an in-app browser without Quick Look support as mobile but not AR-capable", () => {
    const result = detectARCapability(IOS_WHATSAPP, false, false);
    expect(result.isMobile).toBe(true);
    expect(result.arSupported).toBe(false);
  });

  it("treats desktop Chrome as non-mobile regardless of AR support", () => {
    const result = detectARCapability(DESKTOP_CHROME, false, false);
    expect(result.isMobile).toBe(false);
    expect(result.isInAppBrowser).toBe(false);
  });

  it("flags LinkedIn's in-app browser on Android and forces arSupported false even though it looks like plain Android Chrome", () => {
    const result = detectARCapability(ANDROID_LINKEDIN, false, true);
    expect(result.isMobile).toBe(true);
    expect(result.isInAppBrowser).toBe(true);
    expect(result.arSupported).toBe(false);
  });

  it("flags LinkedIn's in-app browser on iOS even with Quick Look anchor support", () => {
    const result = detectARCapability(IOS_LINKEDIN, true, false);
    expect(result.isMobile).toBe(true);
    expect(result.isInAppBrowser).toBe(true);
    expect(result.arSupported).toBe(false);
  });

  it("flags Instagram's in-app browser on Android", () => {
    const result = detectARCapability(ANDROID_INSTAGRAM, false, true);
    expect(result.isInAppBrowser).toBe(true);
    expect(result.arSupported).toBe(false);
  });
});
