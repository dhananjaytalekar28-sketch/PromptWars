"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Profile, Moment, Role } from "@/lib/types";
import { LANGUAGES, getTranslations, t as tFn, type LangCode, type Translations } from "@/lib/i18n";

interface AppState {
  profile: Profile | null;
  moment: Moment | null;
  theme: "light" | "dark";
  lang: LangCode;
  dir: "ltr" | "rtl";
  translations: Translations;
  t: (key: string, vars?: Record<string, string>) => string;
  setProfile: (p: Profile | null) => void;
  setMoment: (m: Moment | null) => void;
  updateMoment: (partial: Partial<Moment>) => void;
  toggleTheme: () => void;
  setLang: (code: LangCode) => void;
  switchRole: (role: Role) => void;
}

const AppContext = createContext<AppState | null>(null);

function loadJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function saveJSON(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [moment, setMomentState] = useState<Moment | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [lang, setLangState] = useState<LangCode>("en");
  const [hydrated, setHydrated] = useState(false);

  const langDef = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const dir = langDef.dir;
  const translations = getTranslations(lang);
  const t = useCallback((key: string, vars?: Record<string, string>) => tFn(translations, key, vars), [translations]);

  useEffect(() => {
    setProfileState(loadJSON<Profile>("rp_profile"));
    setMomentState(loadJSON<Moment>("rp_moment"));
    const savedTheme = localStorage.getItem("rp_theme") as "light" | "dark" | null;
    const savedLang = localStorage.getItem("rp_lang") as LangCode | null;
    if (savedTheme) setTheme(savedTheme);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
    if (savedLang && LANGUAGES.some((l) => l.code === savedLang)) setLangState(savedLang);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("rp_theme", theme);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
    localStorage.setItem("rp_lang", lang);
  }, [lang, dir, hydrated]);

  const setProfile = useCallback((p: Profile | null) => {
    setProfileState(p);
    saveJSON("rp_profile", p);
  }, []);

  const setMoment = useCallback((m: Moment | null) => {
    setMomentState(m);
    saveJSON("rp_moment", m);
  }, []);

  const updateMoment = useCallback((partial: Partial<Moment>) => {
    setMomentState((prev) => {
      const updated = prev ? { ...prev, ...partial, updatedAt: new Date().toISOString() } : null;
      saveJSON("rp_moment", updated);
      return updated;
    });
  }, []);

  const toggleTheme = useCallback(() => setTheme((t) => (t === "light" ? "dark" : "light")), []);
  const setLang = useCallback((code: LangCode) => setLangState(code), []);
  const switchRole = useCallback(
    (role: Role) => {
      const newProfile: Profile = { ...profile, role };
      setProfileState(newProfile);
      saveJSON("rp_profile", newProfile);
    },
    [profile]
  );

  if (!hydrated) {
    return <div className="min-h-screen" />;
  }

  return (
    <AppContext.Provider
      value={{ profile, moment, theme, lang, dir, translations, t, setProfile, setMoment, updateMoment, toggleTheme, setLang, switchRole }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
