"use client";

import { useApp } from "@/context/AppContext";

const HELPLINES = [
  { name: "SAMHSA National Helpline", phone: "1-800-662-4357", url: "https://www.samhsa.gov/find-help/national-helpline" },
  { name: "988 Suicide & Crisis Lifeline", phone: "988", url: "https://988lifeline.org/" },
  { name: "Crisis Text Line", phone: "Text HOME to 741741", url: "https://www.crisistextline.org/" },
] as const;

export default function SafetyPage() {
  const { moment } = useApp();

  function copyScript(which: "person" | "caregiver") {
    const text =
      which === "person" ? moment?.lastScripts?.personScript : moment?.lastScripts?.caregiverScript;
    if (text) navigator.clipboard.writeText(text);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Safety &amp; Grounding</h1>

      {/* Grounding exercise */}
      <section className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <h2 className="font-semibold text-lg mb-3">🌿 5-4-3-2-1 Grounding</h2>
        <p className="text-[var(--color-text-muted)] text-sm mb-3">
          Focus on what&apos;s around you right now:
        </p>
        <ul className="space-y-2 text-sm">
          <li><strong>5</strong> things you can <strong>see</strong></li>
          <li><strong>4</strong> things you can <strong>touch</strong></li>
          <li><strong>3</strong> things you can <strong>hear</strong></li>
          <li><strong>2</strong> things you can <strong>smell</strong></li>
          <li><strong>1</strong> thing you can <strong>taste</strong></li>
        </ul>
      </section>

      {/* Helplines */}
      <section>
        <h2 className="font-semibold text-lg mb-3">📞 Helplines</h2>
        <div className="flex flex-col gap-3">
          {HELPLINES.map((h) => (
            <a
              key={h.name}
              href={h.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] block"
            >
              <p className="font-semibold">{h.name}</p>
              <p className="text-sm text-[var(--color-primary)]">{h.phone}</p>
            </a>
          ))}
        </div>
      </section>

      {/* Copy last scripts */}
      {moment?.lastScripts && (
        <section>
          <h2 className="font-semibold text-lg mb-3">📋 Copy Last Scripts</h2>
          <div className="flex gap-3">
            <button
              onClick={() => copyScript("person")}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              aria-label="Copy person script to clipboard"
            >
              📋 Person Script
            </button>
            <button
              onClick={() => copyScript("caregiver")}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              aria-label="Copy caregiver script to clipboard"
            >
              📋 Caregiver Script
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
