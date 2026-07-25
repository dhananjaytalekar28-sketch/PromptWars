"use client";

import { useFlash } from "@/shared/context/flash-context";
import { useSession } from "@/shared/context/session-context";
import { useSettings } from "@/shared/context/settings-context";
import { allowedChips as ALLOWED_CHIPS } from "@/features/check-in/schemas";
import type { ChipId, Moment } from "@/features/check-in/types";
import { usePageTitle, useRequireProfile } from "@/shared/hooks/use-guards";
import { useState } from "react";
import Link from "next/link";

export default function PersonHome() {
  const { moment, setMoment } = useSession();
  const { setFlash } = useFlash();
  const { t, tDynamic } = useSettings();
  const { ready, profile } = useRequireProfile("person");
  const [risk, setRisk] = useState<number>(moment?.riskLevel ?? 3);
  const [chips, setChips] = useState<ChipId[]>((moment?.chips as ChipId[]) ?? []);
  const [status, setStatus] = useState<string | null>(null);

  usePageTitle(t("nav.home"));

  if (!ready || !profile) {
    return <p className="text-sm text-[var(--color-text-muted)]">{t("common.loading")}</p>;
  }

  function toggleChip(chip: ChipId) {
    setChips((prev) => (prev.includes(chip) ? prev.filter((c) => c !== chip) : [...prev, chip]));
  }

  function handleCheckIn() {
    if (chips.length === 0) return;
    const now = new Date().toISOString();
    const m: Moment = {
      id: moment?.id ?? crypto.randomUUID(),
      updatedAt: now,
      riskLevel: risk as 1 | 2 | 3 | 4 | 5,
      chips,
      lastIntervention: moment?.lastIntervention,
      lastScripts: moment?.lastScripts,
      lastBriefing: moment?.lastBriefing,
      lastLearnBlurb: moment?.lastLearnBlurb,
    };
    setMoment(m);
    setFlash("person.checkin.success");
    setStatus(t("person.checkin.success"));
  }

  // Live selection drives high-risk CTA (not stale saved moment alone).
  const isHighRisk = risk >= 4;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        {profile.nickname
          ? t("person.greeting", { name: profile.nickname })
          : t("person.greeting.default")}
      </h1>

      <div className="sr-only" aria-live="polite">
        {status}
      </div>

      <section aria-label={t("person.risk.label")}>
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">{t("person.risk.label")}</p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t("person.risk.label")}>
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              type="button"
              role="radio"
              aria-checked={risk === level}
              onClick={() => setRisk(level)}
              className={`inline-flex h-12 w-12 items-center justify-center rounded-full border-2 text-lg font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                risk === level
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                  : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </section>

      <section aria-label={t("person.chips.label")}>
        <p className="mb-2 text-sm text-[var(--color-text-muted)]">{t("person.chips.label")}</p>
        <div className="flex flex-wrap gap-2">
          {ALLOWED_CHIPS.map((chip) => (
            <button
              key={chip}
              type="button"
              aria-pressed={chips.includes(chip)}
              onClick={() => toggleChip(chip)}
              className={`min-h-11 rounded-[var(--radius-control)] px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                chips.includes(chip)
                  ? "bg-[var(--color-chip-active)] text-white"
                  : "bg-[var(--color-chip-bg)] text-[var(--color-chip-text)] hover:bg-[var(--color-chip-active)] hover:text-white"
              }`}
            >
              {tDynamic(`chip.${chip}`)}
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={handleCheckIn}
        disabled={chips.length === 0}
        className="min-h-11 self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:opacity-40"
      >
        {t("person.checkin")}
      </button>

      {moment && (
        <section className="mt-4 flex flex-col gap-3" aria-label={t("person.quickActions")}>
          {isHighRisk && (
            <p className="rounded-[var(--radius)] border border-[var(--color-alert-border)] bg-[var(--color-alert-bg)] p-3 text-sm text-[var(--color-alert-text)]">
              {t("person.highRisk")}
            </p>
          )}
          {isHighRisk && (
            <Link
              href="/safety"
              className="block min-h-11 rounded-[var(--radius)] border border-[var(--color-danger)] bg-[var(--color-surface)] p-4 text-center font-semibold text-[var(--color-danger)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              {t("person.safety.link")}
            </Link>
          )}
          <Link
            href="/intervene"
            className="block min-h-11 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center font-semibold hover:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            {t("person.intervene.link")}
          </Link>
          <Link
            href="/scripts"
            className="block min-h-11 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center font-semibold hover:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            {t("person.scripts.link")}
          </Link>
          {!isHighRisk && (
            <Link
              href="/learn"
              className="block min-h-11 rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 text-center font-semibold hover:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              {t("person.learn.link")}
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
