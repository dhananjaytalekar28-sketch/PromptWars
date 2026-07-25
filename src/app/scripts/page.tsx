"use client";

import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function ScriptsPage() {
  const { moment, updateMoment, t } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scripts, setScripts] = useState<{ personScript: string; caregiverScript: string } | null>(
    moment?.lastScripts ?? null
  );

  if (!moment) {
    router.replace("/");
    return null;
  }

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riskLevel: moment!.riskLevel,
          chips: moment!.chips,
          voiceOrTextNote: moment!.voiceOrTextNote,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Request failed");
      }
      const data = await res.json();
      setScripts(data);
      updateMoment({ lastScripts: { ...data, at: new Date().toISOString() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }

  function speakText(text: string) {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("scripts.title")}</h1>
      <p className="text-[var(--color-text-muted)]">{t("scripts.subtitle")}</p>

      <button
        onClick={generate}
        disabled={loading}
        className="self-start px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold disabled:opacity-40 hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] transition-colors"
      >
        {loading ? t("scripts.generating") : scripts ? t("scripts.regenerate") : t("scripts.generate")}
      </button>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-100 dark:bg-red-950 text-[var(--color-danger)] text-sm">
          {error} — <button onClick={generate} className="underline font-medium">{t("error.retry")}</button>
        </div>
      )}

      {scripts && (
        <div className="grid gap-4 md:grid-cols-2">
          <ScriptPanel
            title={t("scripts.person.title")}
            text={scripts.personScript}
            copyLabel={t("scripts.copy")}
            speakLabel={t("scripts.speak")}
            onCopy={() => copyToClipboard(scripts.personScript)}
            onSpeak={() => speakText(scripts.personScript)}
          />
          <ScriptPanel
            title={t("scripts.caregiver.title")}
            text={scripts.caregiverScript}
            copyLabel={t("scripts.copy")}
            speakLabel={t("scripts.speak")}
            onCopy={() => copyToClipboard(scripts.caregiverScript)}
            onSpeak={() => speakText(scripts.caregiverScript)}
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
  onCopy,
  onSpeak,
}: {
  title: string;
  text: string;
  copyLabel: string;
  speakLabel: string;
  onCopy: () => void;
  onSpeak: () => void;
}) {
  return (
    <section className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
      <h2 className="font-semibold mb-2">{title}</h2>
      <p className="text-sm text-[var(--color-text-muted)] whitespace-pre-line">{text}</p>
      <div className="flex gap-2 mt-3">
        <button
          onClick={onCopy}
          className="px-3 py-1 text-xs rounded border border-[var(--color-border)] hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          aria-label={`${copyLabel} ${title}`}
        >
          📋 {copyLabel}
        </button>
        <button
          onClick={onSpeak}
          className="px-3 py-1 text-xs rounded border border-[var(--color-border)] hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          aria-label={`${speakLabel} ${title}`}
        >
          🔊 {speakLabel}
        </button>
      </div>
    </section>
  );
}
