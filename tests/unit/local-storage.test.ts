import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  createBrowserStorageAdapter,
  createLocalStorageAdapter,
} from "@/shared/persistence/local-storage";

const itemSchema = z
  .object({
    id: z.string().min(1),
    count: z.number().int().nonnegative(),
  })
  .strict();

function createMemoryStorage(seed: Record<string, string> = {}): Storage {
  const map = new Map<string, string>(Object.entries(seed));
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? (map.get(key) ?? null) : null;
    },
    key(index: number) {
      return [...map.keys()][index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, value);
    },
  };
}

describe("createLocalStorageAdapter", () => {
  it("hydrates a valid stored value through the schema", () => {
    const storage = createMemoryStorage({
      rp_item: JSON.stringify({ id: "a1", count: 2 }),
    });
    const adapter = createLocalStorageAdapter(storage);

    expect(adapter.read("rp_item", itemSchema)).toEqual({ id: "a1", count: 2 });
  });

  it("returns null when the key is missing", () => {
    const adapter = createLocalStorageAdapter(createMemoryStorage());

    expect(adapter.read("missing", itemSchema)).toBeNull();
  });

  it("removes malformed JSON and returns null", () => {
    const storage = createMemoryStorage({ rp_item: "{not-json" });
    const adapter = createLocalStorageAdapter(storage);

    expect(adapter.read("rp_item", itemSchema)).toBeNull();
    expect(storage.getItem("rp_item")).toBeNull();
  });

  it("removes schema-invalid values and returns null", () => {
    const storage = createMemoryStorage({
      rp_item: JSON.stringify({ id: "a1", count: -1 }),
    });
    const adapter = createLocalStorageAdapter(storage);

    expect(adapter.read("rp_item", itemSchema)).toBeNull();
    expect(storage.getItem("rp_item")).toBeNull();
  });

  it("writes values and can read them back", () => {
    const storage = createMemoryStorage();
    const adapter = createLocalStorageAdapter(storage);

    adapter.write("rp_item", { id: "b2", count: 4 });

    expect(adapter.read("rp_item", itemSchema)).toEqual({ id: "b2", count: 4 });
  });

  it("tolerates quota and security write failures without throwing", () => {
    const storage = createMemoryStorage();
    storage.setItem = () => {
      throw new DOMException("QuotaExceededError");
    };
    const adapter = createLocalStorageAdapter(storage);

    expect(() => adapter.write("rp_item", { id: "c3", count: 1 })).not.toThrow();
  });

  it("removes keys without throwing", () => {
    const storage = createMemoryStorage({ rp_item: '{"id":"x","count":1}' });
    const adapter = createLocalStorageAdapter(storage);

    adapter.remove("rp_item");

    expect(storage.getItem("rp_item")).toBeNull();
  });

  it("never logs stored content while recovering corruption", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    const debugSpy = vi.spyOn(console, "debug").mockImplementation(() => {});

    const secret = '{"id":"secret-payload","count":1';
    const storage = createMemoryStorage({ rp_item: "{bad" + secret });
    const adapter = createLocalStorageAdapter(storage);

    adapter.read("rp_item", itemSchema);

    for (const spy of [errorSpy, warnSpy, logSpy, infoSpy, debugSpy]) {
      for (const call of spy.mock.calls) {
        expect(JSON.stringify(call)).not.toContain("secret-payload");
        expect(JSON.stringify(call)).not.toContain("{bad");
      }
    }

    errorSpy.mockRestore();
    warnSpy.mockRestore();
    logSpy.mockRestore();
    infoSpy.mockRestore();
    debugSpy.mockRestore();
  });
});

describe("createBrowserStorageAdapter", () => {
  it("returns null without throwing when accessing localStorage throws SecurityError", () => {
    const getLocalStorage = (): Storage => {
      throw new DOMException(
        "Failed to read the 'localStorage' property from 'Window': Access is denied.",
        "SecurityError",
      );
    };

    expect(() => createBrowserStorageAdapter(getLocalStorage)).not.toThrow();
    expect(createBrowserStorageAdapter(getLocalStorage)).toBeNull();
  });

  it("returns null when storage is explicitly unavailable (SSR / no window)", () => {
    expect(createBrowserStorageAdapter(null)).toBeNull();
  });

  it("returns a working adapter when localStorage is accessible", () => {
    const memory = createMemoryStorage({
      rp_item: JSON.stringify({ id: "ok", count: 1 }),
    });
    const adapter = createBrowserStorageAdapter(() => memory);

    expect(adapter).not.toBeNull();
    expect(adapter?.read("rp_item", itemSchema)).toEqual({ id: "ok", count: 1 });
  });
});
