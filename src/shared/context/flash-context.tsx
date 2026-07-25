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

interface FlashState {
  flash: string | null;
  setFlash: (key: string | null) => void;
  clearFlash: () => void;
}

const FlashContext = createContext<FlashState | null>(null);

export function FlashProvider({ children }: { children: ReactNode }) {
  const [flash, setFlashState] = useState<string | null>(null);

  const setFlash = useCallback((key: string | null) => setFlashState(key), []);
  const clearFlash = useCallback(() => setFlashState(null), []);

  useEffect(() => {
    if (!flash) return;
    const timer = window.setTimeout(() => clearFlash(), 6000);
    return () => window.clearTimeout(timer);
  }, [flash, clearFlash]);

  const value = useMemo(
    () => ({
      flash,
      setFlash,
      clearFlash,
    }),
    [flash, setFlash, clearFlash],
  );

  return <FlashContext.Provider value={value}>{children}</FlashContext.Provider>;
}

export function useFlash(): FlashState {
  const ctx = useContext(FlashContext);
  if (!ctx) throw new Error("useFlash must be used within FlashProvider");
  return ctx;
}
