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
    const filePath = path.join(this.uploadDir, key);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(filePath, buffer);
    return this.getUrl(key);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    await fs.unlink(filePath).catch(() => {});
  }

  getUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
}
