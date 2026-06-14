import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ProductInquirySheet } from "@/components/ProductInquirySheet";

global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: 1 }) });

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ data: { whatsappNumber: "1234567890", contactEmail: "test@test.com" } }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
  useMediaQuery: () => false,
}));

const mockProduct = {
  id: 1,
  name: "The Cloud Sofa",
  price: 249900,
  arLink: "https://example.com/model.glb",
  images: [],
  colors: ["#2d2d2d"],
  sizes: ["2-Seater"],
  description: "A luxury sofa",
  categoryId: 1,
  isHidden: false,
  stockStatus: "in_stock",
  sortOrder: 0,
};

describe("ProductInquirySheet", () => {
  it("renders the trigger button", () => {
    render(
      <ProductInquirySheet
        product={mockProduct as any}
        selectedColor="#2d2d2d"
        selectedSize="2-Seater"
      />
    );
    expect(screen.getByText(/Request Information/i)).toBeInTheDocument();
  });

  it("shows the product name in the form", async () => {
    render(
      <ProductInquirySheet
        product={mockProduct as any}
        selectedColor={null}
        selectedSize={null}
      />
    );
    fireEvent.click(screen.getByText(/Request Information/i));
    await waitFor(() => {
      expect(screen.getByText("The Cloud Sofa")).toBeInTheDocument();
    });
  });
});
