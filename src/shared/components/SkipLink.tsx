"use client";

import { useSettings } from "@/shared/context/settings-context";

export function SkipLink() {
  const { t } = useSettings();

  return (
    <a
      href="#main-content"
      className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-control)] focus:bg-[var(--color-primary)] focus:px-4 focus:py-2 focus:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
    >
      {t("common.skip")}
    </a>
  );
}
