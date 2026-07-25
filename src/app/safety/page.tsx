"use client";

import { useApp } from "@/context/AppContext";

const HELPLINES = [
  { name: "SAMHSA National Helpline", phone: "1-800-662-4357", url: "https://www.samhsa.gov/find-help/national-helpline" },
  { name: "988 Suicide & Crisis Lifeline", phone: "988", url: "https://988lifeline.org/" },
  { name: "Crisis Text Line", phone: "Text HOME to 741741", url: "https://www.crisistextline.org/" },
] as const;

export default function SafetyPage() {
  const { moment, t } = useApp();

  function copyScript(which: "person" | "caregiver") {
    const text =
      which === "person" ? moment?.lastScripts?.personScript : moment?.lastScripts?.caregiverScript;
    if (text) navigator.clipboard.writeText(text);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("safety.title")}</h1>

      <section className="p-5 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
        <h2 className="font-semibold text-lg mb-3">🌿 {t("safety.grounding.title")}</h2>
        <p className="text-[var(--color-text-muted)] text-sm mb-3">{t("safety.grounding.subtitle")}</p>
        <ul className="space-y-2 text-sm">
          <li><strong>5</strong> {t("safety.grounding.see")}</li>
          <li><strong>4</strong> {t("safety.grounding.touch")}</li>
          <li><strong>3</strong> {t("safety.grounding.hear")}</li>
          <li><strong>2</strong> {t("safety.grounding.smell")}</li>
          <li><strong>1</strong> {t("safety.grounding.taste")}</li>
        </ul>
      </section>

      <section>
        <h2 className="font-semibold text-lg mb-3">📞 {t("safety.helplines.title")}</h2>
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

      {moment?.lastScripts && (
        <section>
          <h2 className="font-semibold text-lg mb-3">📋 {t("safety.copy.title")}</h2>
          <div className="flex gap-3">
            <button
              onClick={() => copyScript("person")}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              aria-label={t("safety.copy.person")}
            >
              📋 {t("safety.copy.person")}
            </button>
            <button
              onClick={() => copyScript("caregiver")}
              className="px-4 py-2 rounded-lg border border-[var(--color-border)] text-sm hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              aria-label={t("safety.copy.caregiver")}
            >
              📋 {t("safety.copy.caregiver")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
