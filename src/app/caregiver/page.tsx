"use client";

import { useSession } from "@/shared/context/session-context";
import { useSettings } from "@/shared/context/settings-context";
import { useAiAction } from "@/features/ai/use-ai-action";
import { usePageTitle, useRequireProfile } from "@/shared/hooks/use-guards";
import Link from "next/link";

export default function CaregiverHome() {
  const { moment, updateMoment } = useSession();
  const { lang, t, tDynamic } = useSettings();
  const { ready, profile } = useRequireProfile("caregiver");

  const { state, run, retry } = useAiAction({
    action: "briefing",
    initialData: moment?.lastBriefing
      ? {
          briefing: moment.lastBriefing.briefing,
          doSay: moment.lastBriefing.doSay,
          dontSay: moment.lastBriefing.dontSay,
        }
      : null,
    onSuccess: (data) => {
      updateMoment({
        lastBriefing: {
          ...data,
          at: new Date().toISOString(),
        },
      });
    },
  });

  usePageTitle(t("nav.home"));

  if (!ready || !profile) {
    return <p className="text-sm text-[var(--color-text-muted)]">{t("common.loading")}</p>;
  }

  const briefing = state.data;
  const loading = state.status === "loading";
  const error = state.error?.safeMessage ?? null;
  const status =
    state.status === "loading"
      ? t("ai.status.generating")
      : state.status === "success"
        ? t("ai.status.ready")
        : null;

  async function generateBriefing() {
    if (!moment) return;
    await run({
      riskLevel: moment.riskLevel,
      chips: moment.chips,
      voiceOrTextNote: moment.voiceOrTextNote,
    });
  }

  const updatedLabel = moment
    ? new Intl.DateTimeFormat(lang, { dateStyle: "medium", timeStyle: "short" }).format(
        new Date(moment.updatedAt),
      )
    : "";

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        {profile.nickname
          ? t("caregiver.greeting", { name: profile.nickname })
          : t("caregiver.greeting.default")}
      </h1>

      <div className="sr-only" aria-live="polite">
        {status}
      </div>

      {!moment ? (
        <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-center">
          <p className="text-[var(--color-text-muted)]">{t("caregiver.empty")}</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("caregiver.empty.tip")}</p>
        </div>
      ) : (
        <>
          <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
            <p className="text-sm text-[var(--color-text-muted)]">{t("caregiver.lastcheckin")}</p>
            <p className="font-semibold">
              {t("caregiver.urgelevel", {
                level: String(moment.riskLevel),
                chips: moment.chips.map((c) => tDynamic(`chip.${c}`)).join(", "),
              })}
            </p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              {t("common.updated")}: {updatedLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={generateBriefing}
            disabled={loading}
            className="min-h-11 self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:opacity-40"
          >
            {loading
              ? t("caregiver.generating")
              : briefing
                ? t("caregiver.regenerate")
                : t("caregiver.generate")}
          </button>

          {error && (
            <div
              role="alert"
              className="rounded-[var(--radius)] bg-red-100 p-3 text-sm text-[var(--color-danger)] dark:bg-red-950"
            >
              {error} —{" "}
              <button type="button" onClick={() => void retry()} className="font-medium underline">
                {t("error.retry")}
              </button>
            </div>
          )}

          {briefing && (
            <section className="flex flex-col gap-4">
              <div className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                <h2 className="mb-2 font-semibold">{t("caregiver.experiencing")}</h2>
                <p className="text-sm text-[var(--color-text-muted)]">{briefing.briefing}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-[var(--radius)] border border-green-200 bg-green-50 p-4 dark:border-green-800 dark:bg-green-950">
                  <h3 className="mb-2 font-semibold text-[var(--color-success)]">
                    {t("caregiver.dosay")}
                  </h3>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {briefing.doSay.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rounded-[var(--radius)] border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
                  <h3 className="mb-2 font-semibold text-[var(--color-danger)]">
                    {t("caregiver.dontsay")}
                  </h3>
                  <ul className="list-inside list-disc space-y-1 text-sm">
                    {briefing.dontSay.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href="/scripts"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border-2 border-[var(--color-primary)] px-5 py-2 font-semibold text-[var(--color-primary)] hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              {t("caregiver.viewscripts")}
            </Link>
            <Link
              href="/safety"
              className="inline-flex min-h-11 items-center rounded-[var(--radius-control)] border-2 border-[var(--color-danger)] px-5 py-2 font-semibold text-[var(--color-danger)] hover:bg-red-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] dark:hover:bg-red-950"
            >
              {t("caregiver.safety")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
