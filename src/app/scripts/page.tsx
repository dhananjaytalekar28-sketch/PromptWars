"use client";

import { useSession } from "@/shared/context/session-context";
import { useSettings } from "@/shared/context/settings-context";
import { useAiAction } from "@/features/ai/use-ai-action";
import { usePageTitle, useRequireMoment, useRequireProfile } from "@/shared/hooks/use-guards";
import { useState } from "react";
import type { LangCode } from "@/shared/i18n";

const SPEECH_LANG: Record<LangCode, string> = {
  en: "en-US",
  ar: "ar-SA",
  es: "es-ES",
  nb: "nb-NO",
};

export default function ScriptsPage() {
  const { updateMoment, homePath } = useSession();
  const { lang, t } = useSettings();
  const { ready: profileReady } = useRequireProfile();
  const { ready: momentReady, moment } = useRequireMoment(
    homePath === "/caregiver" ? "/caregiver" : "/person",
  );
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const { state, run, retry } = useAiAction({
    action: "scripts",
    initialData: moment?.lastScripts
      ? {
          personScript: moment.lastScripts.personScript,
          caregiverScript: moment.lastScripts.caregiverScript,
        }
      : null,
    onSuccess: (data) => {
      updateMoment({ lastScripts: { ...data, at: new Date().toISOString() } });
    },
  });

  usePageTitle(t("scripts.title"));

  if (!profileReady || !momentReady || !moment) {
    return <p className="text-sm text-[var(--color-text-muted)]">{t("common.loading")}</p>;
  }

  const scripts = state.data;
  const loading = state.status === "loading";
  const error = state.error?.safeMessage ?? null;
  const aiStatus =
    state.status === "loading"
      ? t("ai.status.generating")
      : state.status === "success"
        ? t("ai.status.ready")
        : null;
  const status = copyStatus ?? aiStatus;

  async function generate() {
    await run({
      riskLevel: moment!.riskLevel,
      chips: moment!.chips,
      voiceOrTextNote: moment!.voiceOrTextNote,
    });
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(t("scripts.copied"));
    } catch {
      setCopyStatus(t("common.copyFailed"));
    }
  }

  function speakText(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = SPEECH_LANG[lang] ?? "en-US";
    utterance.rate = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  function stopSpeaking() {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("scripts.title")}</h1>
      <p className="text-[var(--color-text-muted)]">{t("scripts.subtitle")}</p>

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
          ? t("scripts.generating")
          : scripts
            ? t("scripts.regenerate")
            : t("scripts.generate")}
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

      {scripts && (
        <div className="grid gap-4 md:grid-cols-2 md:max-w-[var(--compare-width)]">
          <ScriptPanel
            title={t("scripts.person.title")}
            text={scripts.personScript}
            copyLabel={t("scripts.copy")}
            speakLabel={t("scripts.speak")}
            stopLabel={t("scripts.stop")}
            speaking={speaking}
            onCopy={() => copyToClipboard(scripts.personScript)}
            onSpeak={() => speakText(scripts.personScript)}
            onStop={stopSpeaking}
          />
          <ScriptPanel
            title={t("scripts.caregiver.title")}
            text={scripts.caregiverScript}
            copyLabel={t("scripts.copy")}
            speakLabel={t("scripts.speak")}
            stopLabel={t("scripts.stop")}
            speaking={speaking}
            onCopy={() => copyToClipboard(scripts.caregiverScript)}
            onSpeak={() => speakText(scripts.caregiverScript)}
            onStop={stopSpeaking}
          />
        </div>
      )}
    </div>
  );
}

function ScriptPanel({
  title,
  text,
  copyLabel,
  speakLabel,
  stopLabel,
  speaking,
  onCopy,
  onSpeak,
  onStop,
}: {
  title: string;
  text: string;
  copyLabel: string;
  speakLabel: string;
  stopLabel: string;
  speaking: boolean;
  onCopy: () => void;
  onSpeak: () => void;
  onStop: () => void;
}) {
  return (
    <section className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <p className="whitespace-pre-line text-sm text-[var(--color-text-muted)]">{text}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          aria-label={`${copyLabel} ${title}`}
        >
          {copyLabel}
        </button>
        <button
          type="button"
          onClick={speaking ? onStop : onSpeak}
          className="min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border)] px-3 text-sm hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          aria-label={`${speaking ? stopLabel : speakLabel} ${title}`}
        >
          {speaking ? stopLabel : speakLabel}
        </button>
      </div>
    </section>
  );
}
