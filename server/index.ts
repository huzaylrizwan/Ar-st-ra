import "dotenv/config";
import { config } from "./config.js"; // validates env on startup — crashes with clear message if invalid
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import helmet from "helmet";
import pinoHttp from "pino-http";
import { globalLimiter } from "./middleware/rateLimiter.js";
import { storage } from "./storage.js";
import { execSync } from "child_process";
import path from "path";
import { pool } from "./db";
import { logger } from "./logger.js";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));

app.use(
  express.json({
    limit: "2mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  logger.info({ source }, message);
}

app.use(pinoHttp({
  logger,
  autoLogging: { ignore: (req) => req.url === "/api/analytics/live-visitors" },
}));

app.use("/api", globalLimiter);

// Serve uploaded files from local disk when not using Replit Object Storage
if (config.STORAGE_PROVIDER === "local") {
  app.use("/uploads", express.static(path.resolve(process.cwd(), config.UPLOAD_DIR)));
}

// Auto-push schema if database tables are missing
async function ensureSchema() {
  try {
    await pool.query("SELECT 1 FROM categories LIMIT 1");
  } catch (err: any) {
    if (err.code === "42P01") {
      log("Database tables not found — running schema push...");
      try {
        execSync("npm run db:push", { stdio: "inherit", env: process.env, cwd: process.cwd() });
        log("Schema push complete");
      } catch (pushErr: any) {
        log("Schema push failed: " + (pushErr?.message || "unknown error"));
      }
    }
  }
}


(async () => {
  await ensureSchema();
  try {
    execSync("npm run db:migrate", { stdio: "inherit", env: process.env, cwd: process.cwd() });
  } catch (err: any) {
    log("Migration warning: " + (err?.message || "unknown error"));
  }
  await registerRoutes(httpServer, app);

  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  storage.cleanupOldPageViews().catch((err) => logger.error({ err }, "cleanupOldPageViews failed"));
  setInterval(() => storage.cleanupOldPageViews().catch((err) => logger.error({ err }, "cleanupOldPageViews failed")), TWENTY_FOUR_HOURS);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status ?? err.statusCode ?? 500;
    const code = err.code ?? "INTERNAL_ERROR";

    logger.error({ err, req: { method: req.method, url: req.url }, status }, "Request error");

    if (res.headersSent) return next(err);

    const message = config.NODE_ENV === "production"
      ? "An error occurred. Please try again."
      : err.message ?? "Internal Server Error";

    res.status(status).json({ message, code });
  });

  if (config.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = config.PORT;
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();
