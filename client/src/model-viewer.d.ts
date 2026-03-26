import type { ModelViewerElement } from "@google/model-viewer";

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": React.DetailedHTMLProps<
        React.HTMLAttributes<ModelViewerElement> & {
          src?: string;
          alt?: string;
          ar?: boolean;
          "ar-modes"?: string;
          "camera-controls"?: boolean;
          "auto-rotate"?: boolean;
          "shadow-intensity"?: string;
          "environment-image"?: string;
          exposure?: string;
          style?: React.CSSProperties;
        },
        ModelViewerElement
      >;
    }
  }
}
