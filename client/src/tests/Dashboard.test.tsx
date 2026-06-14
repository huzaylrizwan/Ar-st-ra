import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Dashboard from "@/pages/admin/Dashboard";

vi.mock("@/hooks/use-products", () => ({
  useProducts: () => ({
    data: [
      { id: 1, price: 249900, arLink: "https://example.com/model.glb", isHidden: false },
      { id: 2, price: 49900,  arLink: "",                              isHidden: false },
      { id: 3, price: 389900, arLink: "https://example.com/bed.glb",   isHidden: false },
    ],
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-categories", () => ({
  useCategories: () => ({ data: [{ id: 1 }, { id: 2 }], isLoading: false }),
}));

vi.mock("@/components/AdminLayout", () => ({
  AdminLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("Dashboard", () => {
  it("shows Total Value in dollars, not cents", () => {
    render(<Dashboard />);
    // 249900 + 49900 + 389900 = 689700 cents = $6,897
    // The exact formatting depends on locale - check for dollar sign and correct magnitude
    const totalValueElement = screen.getByText(/^\$6[.,]897$/);
    expect(totalValueElement).toBeInTheDocument();
    expect(screen.queryByText(/\$689[.,]700/)).not.toBeInTheDocument();
  });

  it("shows AR Enabled count correctly", () => {
    render(<Dashboard />);
    // 2 products have arLink
    // There will be two "2"s on the dashboard: Categories and AR Enabled, both equal 2
    const twoElements = screen.getAllByText("2");
    expect(twoElements.length).toBe(2);
  });
});
