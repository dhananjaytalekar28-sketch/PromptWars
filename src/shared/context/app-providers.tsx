"use client";

import type { ReactNode } from "react";
import { FlashProvider } from "./flash-context";
import { SessionProvider, useSession } from "./session-context";
import { SettingsProvider, useSettings } from "./settings-context";

function HydrationGate({ children }: { children: ReactNode }) {
  const { hydrated: sessionHydrated } = useSession();
  const { hydrated: settingsHydrated } = useSettings();

  if (!sessionHydrated || !settingsHydrated) {
    return (
      <div
        className="min-h-screen flex items-center justify-center bg-[var(--color-bg)]"
        aria-busy="true"
      >
        <p className="text-sm text-[var(--color-text-muted)]">Loading…</p>
      </div>
    );
  }

  return children;
}

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <SettingsProvider>
        <FlashProvider>
          <HydrationGate>{children}</HydrationGate>
        </FlashProvider>
      </SettingsProvider>
    </SessionProvider>
  );
}
