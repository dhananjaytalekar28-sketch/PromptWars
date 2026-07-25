import "./mock-navigation";
import { render, type RenderOptions, type RenderResult } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { afterEach, beforeEach, vi } from "vitest";
import type { Moment } from "@/features/check-in/types";
import type { Profile } from "@/features/profile/types";
import { AppProviders } from "@/shared/context/app-providers";
import type { LangCode } from "@/shared/i18n";
import { getMockNavigation } from "./mock-navigation";

export function createMemoryStorage(initial: Record<string, string> = {}): Storage {
  const store = new Map<string, string>(Object.entries(initial));

  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

export interface RenderWithProvidersOptions extends Omit<RenderOptions, "wrapper"> {
  profile?: Profile | null;
  moment?: Moment | null;
  lang?: LangCode;
  theme?: "light" | "dark";
  pathname?: string;
  storage?: Storage;
}

function seedStorage(
  storage: Storage,
  options: Pick<RenderWithProvidersOptions, "profile" | "moment" | "lang" | "theme">,
): void {
  if (options.profile !== undefined) {
    if (options.profile === null) {
      storage.removeItem("rp_profile");
    } else {
      storage.setItem("rp_profile", JSON.stringify(options.profile));
    }
  }

  if (options.moment !== undefined) {
    if (options.moment === null) {
      storage.removeItem("rp_moment");
    } else {
      storage.setItem("rp_moment", JSON.stringify(options.moment));
    }
  }

  if (options.lang) {
    storage.setItem("rp_lang", options.lang);
  }

  if (options.theme) {
    storage.setItem("rp_theme", options.theme);
  }
}

export interface RenderWithProvidersResult extends RenderResult {
  storage: Storage;
}

export function renderWithProviders(
  ui: ReactElement,
  options: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const storage = options.storage ?? createMemoryStorage();
  seedStorage(storage, options);

  const mockNavigation = getMockNavigation();
  mockNavigation.pathname = options.pathname ?? "/";
  mockNavigation.push.mockClear();
  mockNavigation.replace.mockClear();
  mockNavigation.back.mockClear();

  vi.stubGlobal("localStorage", storage);

  const result = render(<AppProviders>{ui}</AppProviders>, options);
  return { ...result, storage };
}

export function setupProviderTestEnvironment(): void {
  beforeEach(() => {
    const mockNavigation = getMockNavigation();
    vi.stubGlobal("localStorage", createMemoryStorage());
    vi.stubGlobal("crypto", {
      randomUUID: () => "test-moment-id",
    });
    mockNavigation.pathname = "/";
    mockNavigation.push.mockReset();
    mockNavigation.replace.mockReset();
    mockNavigation.back.mockReset();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });
}

export function withProviders(children: ReactNode): ReactElement {
  return <AppProviders>{children}</AppProviders>;
}
