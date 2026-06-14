import "dotenv/config";
import { config } from "./config.js"; // validates env on startup — crashes with clear message if invalid
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import helmet from "helmet";
import { globalLimiter } from "./middleware/rateLimiter.js";
import { storage } from "./storage.js";
import { execSync } from "child_process";
import { pool } from "./db";

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
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

app.use("/api", globalLimiter);

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
  await registerRoutes(httpServer, app);

  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  storage.cleanupOldPageViews().catch(console.error);
  setInterval(() => storage.cleanupOldPageViews().catch(console.error), TWENTY_FOUR_HOURS);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
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
