"use client";

import { useApp } from "@/context/AppContext";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ALLOWED_CHIPS, type ChipId, type Moment } from "@/lib/types";
import Link from "next/link";

export default function PersonHome() {
  const { profile, moment, setMoment, updateMoment } = useApp();
  const router = useRouter();

  const [risk, setRisk] = useState<number>(moment?.riskLevel ?? 3);
  const [chips, setChips] = useState<ChipId[]>((moment?.chips as ChipId[]) ?? []);

  if (!profile || profile.role !== "person") {
    router.replace("/");
    return null;
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
  }

  const isHighRisk = (moment?.riskLevel ?? risk) >= 4;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">
        {profile.nickname ? `Hey ${profile.nickname}` : "Hey there"} — how are you right now?
      </h1>

      {/* Risk level */}
      <section aria-label="Risk level check-in">
        <p className="text-sm text-[var(--color-text-muted)] mb-2">Urge intensity (1 = low, 5 = high)</p>
        <div className="flex gap-2" role="radiogroup" aria-label="Urge intensity">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              role="radio"
              aria-checked={risk === level}
              onClick={() => setRisk(level)}
              className={`w-12 h-12 rounded-full text-lg font-bold border-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
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

      {/* Situation chips */}
      <section aria-label="What's going on">
        <p className="text-sm text-[var(--color-text-muted)] mb-2">What&apos;s going on? (tap all that apply)</p>
        <div className="flex flex-wrap gap-2">
          {ALLOWED_CHIPS.map((chip) => (
            <button
              key={chip}
              aria-pressed={chips.includes(chip)}
              onClick={() => toggleChip(chip)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] ${
                chips.includes(chip)
                  ? "bg-[var(--color-chip-active)] text-white"
                  : "bg-[var(--color-chip-bg)] text-[var(--color-chip-text)] hover:bg-[var(--color-chip-active)] hover:text-white"
              }`}
            >
              {chip.replace("-", " ")}
            </button>
          ))}
        </div>
      </section>

      <button
        onClick={handleCheckIn}
        disabled={chips.length === 0}
        className="self-start px-6 py-3 rounded-full bg-[var(--color-primary)] text-white font-semibold disabled:opacity-40 hover:bg-[var(--color-primary-hover)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] transition-colors"
      >
        Check in
      </button>

      {moment && (
        <section className="flex flex-col gap-3 mt-4" aria-label="Quick actions">
          {isHighRisk && (
            <Link
              href="/safety"
              className="block p-4 rounded-xl bg-red-100 dark:bg-red-950 border border-red-300 dark:border-red-800 text-center font-semibold text-[var(--color-danger)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              🆘 Safety &amp; Helplines
            </Link>
          )}
          <Link
            href="/intervene"
            className="block p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center font-semibold hover:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            🧠 Get Intervention Steps
          </Link>
          <Link
            href="/scripts"
            className="block p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center font-semibold hover:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
          >
            📝 Emergency Scripts
          </Link>
          {!isHighRisk && (
            <Link
              href="/learn"
              className="block p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-center font-semibold hover:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
            >
              📚 Learn &amp; Prevent
            </Link>
          )}
        </section>
      )}
    </div>
  );
}
