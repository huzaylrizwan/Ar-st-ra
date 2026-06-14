import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { supervisors } from "@shared/schema";
import { eq } from "drizzle-orm";
import { authLimiter } from "./middleware/rateLimiter.js";
import { config } from "./config.js";
import { registerLocalAuthRoutes } from "./localAuth.js";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: config.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: config.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        const adminEmail = process.env.ADMIN_EMAIL || "";
        const adminPassword = process.env.ADMIN_PASSWORD || "";

        if (email === adminEmail && adminPassword) {
          const isBcryptHash = adminPassword.startsWith("$2b$") || adminPassword.startsWith("$2a$");
          const valid = isBcryptHash
            ? await bcrypt.compare(password, adminPassword)
            : password === adminPassword;
          if (valid) return done(null, { email, role: "admin", firstName: "Admin" });
          return done(null, false, { message: "Invalid credentials" });
        }

        const [supervisor] = await db.select().from(supervisors).where(eq(supervisors.email, email));
        if (!supervisor?.passwordHash) {
          return done(null, false, { message: "Invalid credentials" });
        }
        const valid = await bcrypt.compare(password, supervisor.passwordHash);
        if (!valid) return done(null, false, { message: "Invalid credentials" });
        return done(null, {
          email: supervisor.email,
          role: "supervisor",
          firstName: supervisor.name || supervisor.email.split("@")[0],
        });
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, cb) => cb(null, user));
  passport.deserializeUser((user: any, cb) => cb(null, user));

  // Register new local auth routes (/api/auth/login, /api/auth/logout, /api/auth/me, /api/auth/setup)
  registerLocalAuthRoutes(app);

  app.post("/api/login", authLimiter, (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || "Invalid credentials" });
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        return res.json(user);
      });
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => res.redirect("/"));
  });
}

export function registerAuthRoutes(app: Express) {
  app.get("/api/auth/user", (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Unauthorized" });
    const user = req.user as any;
    res.json({
      email: user.email,
      firstName: user.firstName || user.email?.split("@")[0] || "User",
      lastName: "",
      role: user.role,
      profileImageUrl: null,
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) return next();
  res.status(401).json({ message: "Unauthorized" });
};
