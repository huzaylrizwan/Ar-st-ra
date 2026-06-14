import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import { storage } from "./storage.js";
import { authLimiter } from "./middleware/rateLimiter.js";
import type { Express } from "express";

passport.use(
  "local-users",
  new LocalStrategy(
    { usernameField: "email" },
    async (email, password, done) => {
      try {
        const user = await storage.getUserByEmail(email);
        if (!user) return done(null, false, { message: "Invalid credentials" });
        if (!user.passwordHash) return done(null, false, { message: "This account uses SSO login" });
        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return done(null, false, { message: "Invalid credentials" });
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

export function registerLocalAuthRoutes(app: Express) {
  app.post("/api/auth/login", authLimiter, async (req, res, next) => {
    passport.authenticate("local-users", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message ?? "Invalid credentials" });
      req.logIn(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        const { passwordHash: _, ...safeUser } = user;
        res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.sendStatus(204);
    });
  });

  app.get("/api/auth/me", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as any;
    const { passwordHash: _, ...safeUser } = user;
    res.json(safeUser);
  });

  // One-time admin setup — disabled after first admin user exists
  app.post("/api/auth/setup", async (req, res) => {
    const existingAdmin = await storage.getAdminUser();
    if (existingAdmin) {
      return res.status(403).json({ message: "Setup already complete" });
    }
    const { email, password, name } = req.body;
    if (!email || !password || password.length < 8) {
      return res.status(400).json({ message: "Email and password (min 8 chars) required" });
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await storage.createUser({ email, passwordHash, name: name ?? null, role: "admin" });
    const { passwordHash: _, ...safeUser } = user;
    res.status(201).json(safeUser);
  });
}
