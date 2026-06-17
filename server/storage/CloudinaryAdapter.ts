import { v2 as cloudinary } from "cloudinary";
import type { StorageAdapter } from "./StorageAdapter.js";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export class CloudinaryAdapter implements StorageAdapter {
  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    const resourceType = contentType.startsWith("image/") ? "image" : "raw";
    // Strip extension — Cloudinary manages its own extensions
    const publicId = `ar-furniture/${key.replace(/\.[^.]+$/, "")}`;

    return new Promise((resolve, reject) => {
      cloudinary.uploader
        .upload_stream({ public_id: publicId, resource_type: resourceType }, (err, result) => {
          if (err) return reject(err);
          if (!result) return reject(new Error("Cloudinary returned no result"));
          resolve(result.secure_url);
        })
        .end(buffer);
    });
  }

  async delete(key: string): Promise<void> {
    const publicId = `ar-furniture/${key.replace(/\.[^.]+$/, "")}`;
    await cloudinary.uploader.destroy(publicId, { resource_type: "image" }).catch(() => {
      // Ignore delete errors — file may have already been removed
    });
  }

  getUrl(key: string): string {
    return cloudinary.url(`ar-furniture/${key}`);
  }
}
