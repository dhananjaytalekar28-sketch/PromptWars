"use client";

import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function CaregiverHome() {
  const { profile, moment, t } = useApp();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [briefing, setBriefing] = useState<{
    briefing: string;
    doSay: string[];
    dontSay: string[];
  } | null>(moment?.lastBriefing ?? null);

  if (!profile || profile.role !== "caregiver") {
    router.replace("/");
    return null;
  }

  async function generateBriefing() {
    if (!moment) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riskLevel: moment.riskLevel,
          chips: moment.chips,
          voiceOrTextNote: moment.voiceOrTextNote,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Request failed");
      }
      const data = await res.json();
      setBriefing(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        {profile.nickname ? t("caregiver.greeting", { name: profile.nickname }) : t("caregiver.greeting.default")}
      </h1>

      {!moment ? (
        <div className="p-6 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center">
          <p className="text-[var(--color-text-muted)]">{t("caregiver.empty")}</p>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">{t("caregiver.empty.tip")}</p>
        </div>
      ) : (
        <>
          <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
            <p className="text-sm text-[var(--color-text-muted)]">{t("caregiver.lastcheckin")}</p>
            <p className="font-semibold">
              {t("caregiver.urgelevel", {
                level: String(moment.riskLevel),
                chips: moment.chips.map((c) => t(`chip.${c}`)).join(", "),
              })}
            </p>
            <p className="text-xs text-[var(--color-text-muted)] mt-1">
              {t("common.updated")}: {new Date(moment.updatedAt).toLocaleString()}
            </p>
          </div>

          <button
            onClick={generateBriefing}
            disabled={loading}
            className="self-start px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold disabled:opacity-40 hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] transition-colors"
          >
            {loading ? t("caregiver.generating") : briefing ? t("caregiver.regenerate") : t("caregiver.generate")}
          </button>

          {error && (
            <div role="alert" className="p-3 rounded-lg bg-red-100 dark:bg-red-950 text-[var(--color-danger)] text-sm">
              {error} — <button onClick={generateBriefing} className="underline font-medium">{t("error.retry")}</button>
            </div>
          )}

          {briefing && (
            <section className="flex flex-col gap-4">
              <div className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <h2 className="font-semibold mb-2">{t("caregiver.experiencing")}</h2>
                <p className="text-sm text-[var(--color-text-muted)]">{briefing.briefing}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
                  <h3 className="font-semibold text-[var(--color-success)] mb-2">✓ {t("caregiver.dosay")}</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {briefing.doSay.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800">
                  <h3 className="font-semibold text-[var(--color-danger)] mb-2">✗ {t("caregiver.dontsay")}</h3>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {briefing.dontSay.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          )}

          <div className="flex gap-3 mt-2">
            <Link
              href="/scripts"
              className="px-5 py-2 rounded-full border-2 border-[var(--color-primary)] text-[var(--color-primary)] font-semibold hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              📝 {t("caregiver.viewscripts")}
            </Link>
            <Link
              href="/safety"
              className="px-5 py-2 rounded-full border-2 border-[var(--color-danger)] text-[var(--color-danger)] font-semibold hover:bg-red-50 dark:hover:bg-red-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              🆘 {t("caregiver.safety")}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
