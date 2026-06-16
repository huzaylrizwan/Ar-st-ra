import "@google/model-viewer";
import { fetchWithCsrf } from "@/lib/queryClient";

export async function generateModelPoster(modelUrl: string): Promise<string | null> {
  const stageBg =
    getComputedStyle(document.documentElement).getPropertyValue("--product-stage").trim() ||
    "#0e0e12";

  return new Promise((resolve) => {
    const container = document.createElement("div");
    // Off-screen but still rendered — visibility:hidden prevents interaction without hiding from renderer
    container.style.cssText =
      "position:fixed;left:-9999px;top:0;width:600px;height:600px;overflow:hidden;pointer-events:none;";
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

    const tid = setTimeout(() => { cleanup(); resolve(null); }, 25000);

    mv.addEventListener("load", () => {
      // Two rAF passes to ensure the WebGL scene has rendered at least one frame
      requestAnimationFrame(() => {
        requestAnimationFrame(async () => {
          try {
            const dataUrl: string = mv.toDataURL("image/png");
            const blob = await (await fetch(dataUrl)).blob();
            const fd = new FormData();
            fd.append("file", blob, "model-poster.png");
            const res = await fetchWithCsrf("/api/uploads", { method: "POST", body: fd });
            if (!res.ok) throw new Error("Upload failed");
            const { url } = await res.json();
            clearTimeout(tid);
            cleanup();
            resolve(url);
          } catch {
            clearTimeout(tid);
            cleanup();
            resolve(null);
          }
        });
      });
    });

    mv.addEventListener("error", () => {
      clearTimeout(tid);
      cleanup();
      resolve(null);
    });

    container.appendChild(mv);
  });
}
