import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("wouter", () => ({
  useRoute: () => [true, { id: "1" }],
  Link: ({ children, href }: any) => <a href={href}>{children}</a>,
  useLocation: () => ["/", vi.fn()],
}));

vi.mock("@/hooks/use-products", () => ({
  useProduct: () => ({
    data: {
      id: 1, name: "Cloud Sofa", price: 249900, description: "Luxury sofa",
      arLink: "https://example.com/model.glb",
      colors: ["#2d2d2d", "#f0f0f0"],
      sizes: ["2-Seater", "3-Seater"],
      images: ["https://example.com/img.jpg"],
      categoryId: 1, isHidden: false, stockStatus: "in_stock", sortOrder: 0,
    },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-categories", () => ({
  useCategory: () => ({ data: { id: 1, name: "Sofas" }, isLoading: false }),
}));

vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ data: { currencySymbol: "$", whatsappNumber: "1234567890" } }),
}));

vi.mock("@/components/Layout", () => ({
  Layout: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ARStudio", () => ({
  ARStudio: () => <div data-testid="ar-studio" />,
}));

vi.mock("@/components/ProductInquirySheet", () => ({
  ProductInquirySheet: ({ product }: any) => (
    <button>Request Information</button>
  ),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
  useMediaQuery: () => false,
}));

vi.mock("embla-carousel-react", () => ({
  default: () => [vi.fn(), { on: vi.fn(), scrollTo: vi.fn(), selectedScrollSnap: () => 0 }],
}));

vi.mock("qrcode.react", () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qrcode" data-value={value} />,
}));

describe("ProductDetails", () => {
  it("shows AR view element when arLink is set", async () => {
    const { default: ProductDetails } = await import("@/pages/ProductDetails");
    render(<ProductDetails />);
    // jsdom doesn't support AR, so QR code shows as fallback
    // Either the button (while detecting) or QR code (after detection) should appear
    await waitFor(() => {
      const hasArButton = !!screen.queryByTestId("button-ar-view");
      const hasQrCode = !!screen.queryByTestId("qrcode");
      expect(hasArButton || hasQrCode).toBe(true);
    });
  });

  it("highlights selected color swatch on click", async () => {
    const { default: ProductDetails } = await import("@/pages/ProductDetails");
    render(<ProductDetails />);
    const swatches = screen.getAllByRole("button", { name: /color/i });
    fireEvent.click(swatches[0]);
    expect(swatches[0]).toHaveClass("ring-primary");
  });

  it("highlights selected size pill on click", async () => {
    const { default: ProductDetails } = await import("@/pages/ProductDetails");
    render(<ProductDetails />);
    const sizeBtn = screen.getByText("2-Seater");
    fireEvent.click(sizeBtn);
    expect(sizeBtn.closest("button")).toHaveClass("border-primary");
  });

  it("shows Request Information button", async () => {
    const { default: ProductDetails } = await import("@/pages/ProductDetails");
    render(<ProductDetails />);
    expect(screen.getByText(/Request Information/i)).toBeInTheDocument();
  });
});
