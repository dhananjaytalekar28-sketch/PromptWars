"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import type { Profile, Moment, Role } from "@/lib/types";

interface AppState {
  profile: Profile | null;
  moment: Moment | null;
  theme: "light" | "dark";
  dir: "ltr" | "rtl";
  setProfile: (p: Profile | null) => void;
  setMoment: (m: Moment | null) => void;
  updateMoment: (partial: Partial<Moment>) => void;
  toggleTheme: () => void;
  toggleDir: () => void;
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
    // quota exceeded — degrade gracefully
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfileState] = useState<Profile | null>(null);
  const [moment, setMomentState] = useState<Moment | null>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [dir, setDir] = useState<"ltr" | "rtl">("ltr");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfileState(loadJSON<Profile>("rp_profile"));
    setMomentState(loadJSON<Moment>("rp_moment"));
    const savedTheme = localStorage.getItem("rp_theme") as "light" | "dark" | null;
    const savedDir = localStorage.getItem("rp_dir") as "ltr" | "rtl" | null;
    if (savedTheme) setTheme(savedTheme);
    else if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
    if (savedDir) setDir(savedDir);
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
    localStorage.setItem("rp_dir", dir);
  }, [dir, hydrated]);

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
  const toggleDir = useCallback(() => setDir((d) => (d === "ltr" ? "rtl" : "ltr")), []);
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
      value={{ profile, moment, theme, dir, setProfile, setMoment, updateMoment, toggleTheme, toggleDir, switchRole }}
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
