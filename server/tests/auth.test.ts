import { describe, it, expect, vi } from "vitest";
import type { Request, Response, NextFunction } from "express";

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    isAuthenticated: () => false,
    user: undefined,
    ...overrides,
  } as unknown as Request;
}

function makeRes(): { status: ReturnType<typeof vi.fn>; json: ReturnType<typeof vi.fn>; sendStatus: ReturnType<typeof vi.fn> } {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    sendStatus: vi.fn().mockReturnThis(),
  };
  return res;
}

// Mirror the requireAdmin logic from routes.ts
function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) return res.sendStatus(401);
  const user = req.user as any;
  if (user?.role !== "admin") return res.sendStatus(403);
  next();
}

describe("requireAdmin middleware", () => {
  it("returns 401 when not authenticated", () => {
    const req = makeReq({ isAuthenticated: () => false });
    const res = makeRes();
    const next = vi.fn();
    requireAdmin(req as Request, res as unknown as Response, next);
    expect(res.sendStatus).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("returns 403 when authenticated but not admin", () => {
    const req = makeReq({ isAuthenticated: () => true, user: { role: "supervisor" } as any });
    const res = makeRes();
    const next = vi.fn();
    requireAdmin(req as Request, res as unknown as Response, next);
    expect(res.sendStatus).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("calls next() when authenticated as admin", () => {
    const req = makeReq({ isAuthenticated: () => true, user: { role: "admin" } as any });
    const res = makeRes();
    const next = vi.fn();
    requireAdmin(req as Request, res as unknown as Response, next);
    expect(next).toHaveBeenCalled();
    expect(res.sendStatus).not.toHaveBeenCalled();
  });
});
