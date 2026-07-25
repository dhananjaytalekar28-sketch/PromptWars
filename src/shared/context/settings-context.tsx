"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  LANGUAGES,
  getEnglishTranslations,
  loadTranslations,
  translate,
  translateDynamic,
  type LangCode,
  type TranslationKey,
  type Translations,
} from "@/shared/i18n";
import { createBrowserStorageAdapter } from "@/shared/persistence/local-storage";

interface SettingsState {
  theme: "light" | "dark";
  lang: LangCode;
  dir: "ltr" | "rtl";
  hydrated: boolean;
  translations: Translations;
  t: (key: TranslationKey, vars?: Record<string, string>) => string;
  tDynamic: (key: string, vars?: Record<string, string>) => string;
  toggleTheme: () => void;
  setLang: (code: LangCode) => void;
}

const SettingsContext = createContext<SettingsState | null>(null);

function safeGetItem(key: string): string | null {
  const adapter = createBrowserStorageAdapter();
  if (!adapter) return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  const adapter = createBrowserStorageAdapter();
  if (!adapter) return;
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota exceeded or security restrictions — fail closed silently
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [lang, setLangState] = useState<LangCode>("en");
  const [hydrated, setHydrated] = useState(false);
  const [translations, setTranslations] = useState<Translations>(getEnglishTranslations);

  const langDef = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const dir = langDef.dir;

  const t = useCallback(
    (key: TranslationKey, vars?: Record<string, string>) => translate(translations, key, vars),
    [translations],
  );

  const tDynamic = useCallback(
    (key: string, vars?: Record<string, string>) => translateDynamic(translations, key, vars),
    [translations],
  );

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- post-mount storage hydration */
    const savedTheme = safeGetItem("rp_theme") as "light" | "dark" | null;
    const savedLang = safeGetItem("rp_lang") as LangCode | null;
    if (savedTheme) setTheme(savedTheme);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
    if (savedLang && LANGUAGES.some((l) => l.code === savedLang)) setLangState(savedLang);
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    let cancelled = false;

    void loadTranslations(lang).then((loaded) => {
      if (!cancelled) setTranslations(loaded);
    });

    return () => {
      cancelled = true;
    };
  }, [lang]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    safeSetItem("rp_theme", theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    safeSetItem("rp_lang", lang);
  }, [lang, dir, hydrated]);

  const toggleTheme = useCallback(
    () => setTheme((prev) => (prev === "light" ? "dark" : "light")),
    [],
  );
  const setLang = useCallback((code: LangCode) => setLangState(code), []);

  const value = useMemo(
    () => ({
      theme,
      lang,
      dir,
      hydrated,
      translations,
      t,
      tDynamic,
      toggleTheme,
      setLang,
    }),
    [theme, lang, dir, hydrated, translations, t, tDynamic, toggleTheme, setLang],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
