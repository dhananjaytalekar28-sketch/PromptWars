import type { z } from "zod";
import type { StorageAdapter } from "./storage";

export function createLocalStorageAdapter(storage: Storage): StorageAdapter {
  return {
    read<T>(key: string, schema: z.ZodType<T>): T | null {
      let raw: string | null;
      try {
        raw = storage.getItem(key);
      } catch {
        return null;
      }

      if (raw === null) return null;

      let parsed: unknown;
      try {
        parsed = JSON.parse(raw) as unknown;
      } catch {
        try {
          storage.removeItem(key);
        } catch {
          // ignore remove failures while recovering corruption
        }
        return null;
      }

      const result = schema.safeParse(parsed);
      if (!result.success) {
        try {
          storage.removeItem(key);
        } catch {
          // ignore remove failures while recovering corruption
        }
        return null;
      }

      return result.data;
    },

    write<T>(key: string, value: T): void {
      try {
        storage.setItem(key, JSON.stringify(value));
      } catch {
        // quota exceeded or security restrictions — fail closed silently
      }
    },

    remove(key: string): void {
      try {
        storage.removeItem(key);
      } catch {
        // security restrictions — fail closed silently
      }
    },
  };
}

function readWindowLocalStorage(): Storage {
  return window.localStorage;
}

/**
 * SSR-safe browser factory. Returns null when storage is unavailable, or when
 * accessing `window.localStorage` throws (e.g. SecurityError). Pass `null` to
 * model unavailable storage without mutating globals (tests / SSR).
 */
export function createBrowserStorageAdapter(
  getLocalStorage: (() => Storage) | null = readWindowLocalStorage,
): StorageAdapter | null {
  if (getLocalStorage === null) {
    return null;
  }

  try {
    if (typeof window === "undefined" && getLocalStorage === readWindowLocalStorage) {
      return null;
    }
    return createLocalStorageAdapter(getLocalStorage());
  } catch {
    return null;
  }
}
