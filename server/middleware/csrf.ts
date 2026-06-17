import Tokens from "csrf";
import type { Request, Response, NextFunction } from "express";
import { config } from "../config.js";

const csrfTokens = new Tokens();

export function generateCsrfToken(): string {
  return csrfTokens.create(config.SESSION_SECRET);
}

export function validateCsrf(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers["x-csrf-token"] as string;
  if (!token || !csrfTokens.verify(config.SESSION_SECRET, token)) {
    res.status(403).json({ message: "Invalid CSRF token" });
    return;
  }
  next();
}
