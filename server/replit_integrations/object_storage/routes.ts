import type { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { nanoid } from "nanoid";
import { getStorageAdapter } from "../../storage/index.js";
import { validateCsrf } from "../../middleware/csrf.js";

function requireAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

// Strict whitelist — no HTML, SVG, PHP, or any executable type allowed
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
  "model/gltf-binary",    // .glb
  "model/gltf+json",      // .gltf
  "application/octet-stream", // some browsers send .glb as this
]);

// Double-check the file extension as a second layer (mime type can be spoofed by client)
const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif",
  ".glb", ".gltf",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB max
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_MIME_TYPES.has(file.mimetype) && ALLOWED_EXTENSIONS.has(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype} / ${ext}`));
    }
  },
});

export function registerObjectStorageRoutes(app: Express): void {
  app.post("/api/uploads", requireAuthenticated, validateCsrf, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file provided" });

      const ext = path.extname(req.file.originalname).toLowerCase();
      const key = `${nanoid()}_${Date.now()}${ext}`;

      const adapter = await getStorageAdapter();
      const url = await adapter.upload(key, req.file.buffer, req.file.mimetype);

      res.json({ url });
    } catch (error: any) {
      if (error?.message?.includes("File type not allowed")) {
        return res.status(400).json({ error: error.message });
      }
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.delete("/api/uploads/:key", requireAuthenticated, validateCsrf, async (req, res) => {
    try {
      const key = String(req.params.key);
      const adapter = await getStorageAdapter();
      await adapter.delete(key);
      res.sendStatus(204);
    } catch (error) {
      console.error("Delete error:", error);
      res.status(500).json({ error: "Delete failed" });
    }
  });
}
