"use client";

import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { callIntervene } from "@/lib/ai-service";

export default function IntervenePage() {
  const { moment, updateMoment, t } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [steps, setSteps] = useState<{ title: string; body: string }[]>(
    moment?.lastIntervention?.steps ?? []
  );

  if (!moment) {
    router.replace("/person");
    return null;
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const data = await callIntervene({
        riskLevel: moment!.riskLevel,
        chips: moment!.chips,
        voiceOrTextNote: moment!.voiceOrTextNote,
      });
      setSteps(data.steps);
      updateMoment({ lastIntervention: { steps: data.steps, at: new Date().toISOString() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("intervene.title")}</h1>
      <p className="text-[var(--color-text-muted)]">{t("intervene.subtitle")}</p>

      <button
        onClick={generate}
        disabled={loading}
        className="self-start px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold disabled:opacity-40 hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] transition-colors"
      >
        {loading ? t("intervene.generating") : steps.length > 0 ? t("intervene.regenerate") : t("intervene.generate")}
      </button>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-100 dark:bg-red-950 text-[var(--color-danger)] text-sm">
          {error} — <button onClick={generate} className="underline font-medium">{t("error.retry")}</button>
        </div>
      )}

      {steps.length > 0 && (
        <ol className="flex flex-col gap-4" aria-label={t("intervene.title")}>
          {steps.map((step, i) => (
            <li key={i} className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <p className="font-semibold text-lg">{i + 1}. {step.title}</p>
              <p className="text-[var(--color-text-muted)] mt-1">{step.body}</p>
            </li>
          ))}
        </ol>
      )}

      {steps.length > 0 && (
        <button
          onClick={() => router.push("/scripts")}
          className="self-start px-6 py-3 rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-semibold hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] transition-colors"
        >
          {t("intervene.toscripts")}
        </button>
      )}
    </div>
  );
}
