import type { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import path from "path";
import { nanoid } from "nanoid";
import { getStorageAdapter } from "../../storage/index.js";

function requireAuthenticated(req: Request, res: Response, next: NextFunction): void {
  if (!req.isAuthenticated()) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  next();
}

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

export function registerObjectStorageRoutes(app: Express): void {
  app.post("/api/uploads", requireAuthenticated, upload.single("file"), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file provided" });

      const ext = path.extname(req.file.originalname).toLowerCase();
      const key = `${nanoid()}_${Date.now()}${ext}`;

      const adapter = await getStorageAdapter();
      const url = await adapter.upload(key, req.file.buffer, req.file.mimetype);

      res.json({ url });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });

  app.delete("/api/uploads/:key", requireAuthenticated, async (req, res) => {
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
