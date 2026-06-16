import "@google/model-viewer";
import { fetchWithCsrf } from "@/lib/queryClient";

export async function generateModelPoster(modelUrl: string): Promise<string | null> {
  // Verify custom element is registered before proceeding
  if (!customElements.get("model-viewer")) {
    console.error("[poster] model-viewer custom element not registered");
    return null;
  }

  const stageBg =
    getComputedStyle(document.documentElement).getPropertyValue("--product-stage").trim() ||
    "#0e0e12";

  return new Promise((resolve) => {
    const container = document.createElement("div");
    // MUST be on-screen for WebGL to render — opacity 0 skips GPU compositing,
    // opacity 0.001 is invisible to the human eye but forces the browser to render it
    container.style.cssText =
      "position:fixed;left:0;top:0;width:600px;height:600px;overflow:hidden;pointer-events:none;z-index:99999;opacity:0.001;";
    document.body.appendChild(container);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mv = document.createElement("model-viewer") as any;
    mv.style.width = "600px";
    mv.style.height = "600px";
    mv.style.backgroundColor = stageBg;
    mv.setAttribute("src", modelUrl);
    mv.setAttribute("camera-orbit", "45deg 70deg auto");
    mv.setAttribute("field-of-view", "30deg");
    mv.setAttribute("exposure", "1");

    const cleanup = () => {
      try { document.body.removeChild(container); } catch { /* already removed */ }
    };

    const tid = setTimeout(() => {
      console.error("[poster] timeout — model never fired load event for:", modelUrl);
      cleanup();
      resolve(null);
    }, 25000);

    mv.addEventListener("load", () => {
      // 500 ms after load gives WebGL time to draw at least one composited frame
      setTimeout(async () => {
        try {
          if (typeof mv.toDataURL !== "function") {
            console.error("[poster] toDataURL not available on model-viewer — check @google/model-viewer version");
            clearTimeout(tid);
            cleanup();
            resolve(null);
            return;
          }

          const dataUrl: string = mv.toDataURL("image/png");

          if (!dataUrl || dataUrl === "data:," || dataUrl.length < 1000) {
            console.error("[poster] toDataURL returned blank/empty canvas — element may not be rendering");
            clearTimeout(tid);
            cleanup();
            resolve(null);
            return;
          }

          const blob = await (await fetch(dataUrl)).blob();
          const fd = new FormData();
          fd.append("file", blob, "model-poster.png");
          const res = await fetchWithCsrf("/api/uploads", { method: "POST", body: fd });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(`Upload failed ${res.status}: ${body?.message ?? ""}`);
          }
          const { url } = await res.json();
          clearTimeout(tid);
          cleanup();
          resolve(url);
        } catch (err) {
          console.error("[poster] capture/upload error:", err);
          clearTimeout(tid);
          cleanup();
          resolve(null);
        }
      }, 500);
    });

    mv.addEventListener("error", (e: Event) => {
      console.error("[poster] model-viewer fired error event:", e);
      clearTimeout(tid);
      cleanup();
      resolve(null);
    });

    container.appendChild(mv);
  });
}
