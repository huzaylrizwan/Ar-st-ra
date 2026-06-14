import { config } from "../config.js";
import type { StorageAdapter } from "./StorageAdapter.js";
import { LocalDiskAdapter } from "./LocalDiskAdapter.js";

let _adapter: StorageAdapter | null = null;

export async function getStorageAdapter(): Promise<StorageAdapter> {
  if (_adapter) return _adapter;

  if (config.STORAGE_PROVIDER === "replit") {
    const { ReplitStorageAdapter } = await import("./ReplitStorageAdapter.js");
    _adapter = new ReplitStorageAdapter();
  } else {
    _adapter = new LocalDiskAdapter();
  }

  return _adapter;
}
