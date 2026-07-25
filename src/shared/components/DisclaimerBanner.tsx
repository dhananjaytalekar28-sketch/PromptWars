"use client";

import { useSettings } from "@/shared/context/settings-context";

export function DisclaimerBanner() {
  const { t } = useSettings();

  return (
    <p className="border-b border-[var(--color-border)] bg-[var(--color-chip-bg)] px-4 py-2 text-center text-xs text-[var(--color-chip-text)]">
      {t("app.disclaimer")}
    </p>
  );
}
