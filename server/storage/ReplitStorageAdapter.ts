import { StorageAdapter } from "./StorageAdapter.js";

// NOTE: objectStorage.ts is currently a stub — the Replit Object Storage SDK was
// replaced. This adapter is kept for interface completeness and future re-wiring.
// When STORAGE_PROVIDER=replit, uploads will fail gracefully with an error.

export class ReplitStorageAdapter implements StorageAdapter {
  async upload(_key: string, _buffer: Buffer, _contentType: string): Promise<string> {
    throw new Error(
      "ReplitStorageAdapter: Replit Object Storage SDK is not configured. " +
        "Set STORAGE_PROVIDER=local or re-wire the Replit SDK in objectStorage.ts."
    );
  }

  async delete(_key: string): Promise<void> {
    throw new Error(
      "ReplitStorageAdapter: Replit Object Storage SDK is not configured."
    );
  }

  getUrl(key: string): string {
    return `/api/storage/${key}`;
  }
}
