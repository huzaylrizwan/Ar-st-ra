import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

import { validateArLink } from "../arLinkValidator.js";

describe("validateArLink", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns valid:true when HEAD request succeeds", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const result = await validateArLink("https://example.com/model.glb");
    expect(result.valid).toBe(true);
    expect(result.attempt).toBe(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("falls back to GET when HEAD fails", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 405 })
      .mockResolvedValueOnce({ ok: true, status: 200 });
    const result = await validateArLink("https://example.com/model.glb");
    expect(result.valid).toBe(true);
    expect(result.attempt).toBe(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("returns valid:false when both requests fail", async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 404 })
      .mockResolvedValueOnce({ ok: false, status: 404 });
    const result = await validateArLink("https://example.com/missing.glb");
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(404);
  });

  it("returns valid:false on network error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    const result = await validateArLink("https://example.com/model.glb");
    expect(result.valid).toBe(false);
    expect(result.statusCode).toBe(0);
  });
});
