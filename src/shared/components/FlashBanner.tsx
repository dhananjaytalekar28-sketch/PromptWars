"use client";

import { useFlash } from "@/shared/context/flash-context";
import { useSettings } from "@/shared/context/settings-context";

export function FlashBanner() {
  const { flash, clearFlash } = useFlash();
  const { t, tDynamic } = useSettings();

  if (!flash) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b border-[var(--color-border)] bg-[var(--color-chip-bg)] px-4 py-3 text-center text-sm text-[var(--color-chip-text)]"
    >
      <div className="mx-auto flex max-w-[var(--shell-width)] items-center justify-center gap-3">
        <p>{tDynamic(flash)}</p>
        <button
          type="button"
          onClick={clearFlash}
          className="rounded-lg border border-[var(--color-border)] px-3 py-1 text-xs font-semibold hover:bg-[var(--color-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        >
          {t("common.dismiss")}
        </button>
      </div>
    </div>
  );
}
