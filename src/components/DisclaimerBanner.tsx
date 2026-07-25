"use client";

import { useApp } from "@/context/AppContext";

export function DisclaimerBanner() {
  const { t } = useApp();
  return (
    <div
      role="alert"
      className="bg-amber-50 dark:bg-amber-950 border-b border-amber-200 dark:border-amber-800 px-4 py-2 text-center text-sm text-amber-900 dark:text-amber-100"
    >
      <strong>{t("app.disclaimer")}</strong>
    </div>
  );
}
