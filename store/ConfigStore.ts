/**
 * ConfigStore — abstraction over storage backend.
 *
 * Current implementation: localStorage (works in Next.js client components).
 * Future: swap LocalStorageConfigStore for TauriConfigStore (tauri-plugin-store)
 * without changing any other app code.
 */

export interface IConfigStore {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

// ---------------------------------------------------------------------------
// LocalStorage implementation
// ---------------------------------------------------------------------------

class LocalStorageConfigStore implements IConfigStore {
  get<T>(key: string): T | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(key, JSON.stringify(value));
  }

  remove(key: string): void {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(key);
  }
}

// ---------------------------------------------------------------------------
// TODO: TauriConfigStore
// Uncomment and implement when Tauri plugin-store is available:
//
// import { Store } from "@tauri-apps/plugin-store";
// class TauriConfigStore implements IConfigStore { ... }
// ---------------------------------------------------------------------------

// Singleton — replace the export target below to switch backend
export const configStore: IConfigStore = new LocalStorageConfigStore();

// ---------------------------------------------------------------------------
// Typed config-specific helpers
// ---------------------------------------------------------------------------

export const CONFIG_STORE_KEY = "clinic_config";
export const SESSION_UNLOCKED_KEY = "session_unlocked";
