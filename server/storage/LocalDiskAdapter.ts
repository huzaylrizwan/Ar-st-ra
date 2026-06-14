import { StorageAdapter } from "./StorageAdapter.js";
import { promises as fs } from "fs";
import path from "path";
import { config } from "../config.js";

export class LocalDiskAdapter implements StorageAdapter {
  private uploadDir: string;
  private baseUrl: string;

  constructor(uploadDir = config.UPLOAD_DIR, baseUrl = "/uploads") {
    this.uploadDir = path.resolve(process.cwd(), uploadDir);
    this.baseUrl = baseUrl;
  }

  async upload(key: string, buffer: Buffer, _contentType: string): Promise<string> {
    const filePath = path.resolve(this.uploadDir, key);
    if (!filePath.startsWith(this.uploadDir + path.sep)) {
      throw new Error("Invalid key: path outside upload directory");
    }
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.resolve(this.uploadDir, key);
    if (!filePath.startsWith(this.uploadDir + path.sep)) {
      throw new Error("Invalid key: path outside upload directory");
    }
    await fs.unlink(filePath).catch((e: NodeJS.ErrnoException) => {
      if (e.code !== "ENOENT") throw e;
    });
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}
