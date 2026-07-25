"use client";

import { useSession } from "@/shared/context/session-context";
import { useSettings } from "@/shared/context/settings-context";
import { useAiAction } from "@/features/ai/use-ai-action";
import { usePageTitle, useRequireMoment, useRequireProfile } from "@/shared/hooks/use-guards";
import { useRouter } from "next/navigation";

export default function IntervenePage() {
  const { updateMoment, homePath } = useSession();
  const { t, tDynamic } = useSettings();
  const { ready: profileReady } = useRequireProfile();
  const { ready: momentReady, moment } = useRequireMoment(
    homePath === "/caregiver" ? "/caregiver" : "/person",
  );
  const router = useRouter();

  const { state, run, retry } = useAiAction({
    action: "intervene",
    initialData: moment?.lastIntervention ?? null,
    onSuccess: (data) => {
      updateMoment({ lastIntervention: { ...data, at: new Date().toISOString() } });
    },
  });

  usePageTitle(t("intervene.title"));

  if (!profileReady || !momentReady || !moment) {
    return <p className="text-sm text-[var(--color-text-muted)]">{t("common.loading")}</p>;
  }

  const steps = state.data?.steps ?? [];
  const loading = state.status === "loading";
  const error = state.error?.safeMessage ?? null;
  const status =
    state.status === "loading"
      ? t("ai.status.generating")
      : state.status === "success"
        ? t("ai.status.ready")
        : null;

  async function generate() {
    await run({
      riskLevel: moment!.riskLevel,
      chips: moment!.chips,
      voiceOrTextNote: moment!.voiceOrTextNote,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("intervene.title")}</h1>
      <p className="text-[var(--color-text-muted)]">{t("intervene.subtitle")}</p>
      <p className="text-sm text-[var(--color-text-muted)]">
        {t("intervene.context", {
          level: String(moment.riskLevel),
          chips: moment.chips.map((c) => tDynamic(`chip.${c}`)).join(", "),
        })}
      </p>

      <div className="sr-only" aria-live="polite">
        {status}
      </div>

      <button
        type="button"
        onClick={generate}
        disabled={loading}
        className="min-h-11 self-start rounded-[var(--radius-control)] bg-[var(--color-primary)] px-6 py-3 font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:opacity-40"
      >
        {loading
          ? t("intervene.generating")
          : steps.length > 0
            ? t("intervene.regenerate")
            : t("intervene.generate")}
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

      {steps.length > 0 && (
        <ol className="flex flex-col gap-4" aria-label={t("intervene.title")}>
          {steps.map((step, i) => (
            <li
              key={`${step.title}-${i}`}
              className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <p className="text-lg font-semibold">
                {i + 1}. {step.title}
              </p>
              <p className="mt-1 text-[var(--color-text-muted)]">{step.body}</p>
            </li>
          ))}
        </ol>
      )}

      {steps.length > 0 && (
        <button
          type="button"
          onClick={() => router.push("/scripts")}
          className="min-h-11 self-start rounded-[var(--radius-control)] border-2 border-[var(--color-primary)] px-6 py-3 font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
        >
          {t("intervene.toscripts")}
        </button>
      )}
    </div>
  );
}
