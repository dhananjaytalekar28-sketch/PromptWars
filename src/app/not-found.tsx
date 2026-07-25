"use client";

import Link from "next/link";
import { useSession } from "@/shared/context/session-context";
import { useSettings } from "@/shared/context/settings-context";

export default function NotFound() {
  const { profile } = useSession();
  const { t } = useSettings();
  const homeHref = profile ? (profile.role === "caregiver" ? "/caregiver" : "/person") : "/";

  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-6 text-center">
      <h1 className="text-2xl font-bold">{t("error.notFound.title")}</h1>
      <p className="max-w-md text-sm text-[var(--color-text-muted)]">
        {t("error.notFound.message")}
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href={homeHref}
          className="min-h-11 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-6 py-2 font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        >
          {t("nav.home")}
        </Link>
        <Link
          href="/safety"
          className="min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border)] px-6 py-2 font-semibold transition-colors hover:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        >
          {t("nav.safety")}
        </Link>
      </div>
    </section>
  );
}
