"use client";

import { useSession } from "@/shared/context/session-context";
import { useSettings } from "@/shared/context/settings-context";
import { usePageTitle } from "@/shared/hooks/use-guards";
import { useMemo, useState } from "react";
import type { LangCode } from "@/shared/i18n";

type Helpline = {
  name: string;
  phone: string;
  tel?: string;
  url: string;
};

const HELPLINES_BY_LANG: Record<LangCode, Helpline[]> = {
  en: [
    {
      name: "SAMHSA National Helpline",
      phone: "1-800-662-4357",
      tel: "+18006624357",
      url: "https://www.samhsa.gov/find-help/national-helpline",
    },
    {
      name: "988 Suicide & Crisis Lifeline",
      phone: "988",
      tel: "988",
      url: "https://988lifeline.org/",
    },
    {
      name: "Crisis Text Line",
      phone: "Text HOME to 741741",
      url: "https://www.crisistextline.org/",
    },
  ],
  es: [
    {
      name: "Línea de la Vida 988 (EE. UU.)",
      phone: "988",
      tel: "988",
      url: "https://988lifeline.org/es/home/",
    },
    {
      name: "Teléfono de la Esperanza (España)",
      phone: "717 003 717",
      tel: "+34717003717",
      url: "https://telefonodelaesperanza.org/",
    },
    {
      name: "Crisis Text Line",
      phone: "Envía HOME al 741741",
      url: "https://www.crisistextline.org/",
    },
  ],
  ar: [
    {
      name: "خط المساعدة 988 (الولايات المتحدة)",
      phone: "988",
      tel: "988",
      url: "https://988lifeline.org/",
    },
    {
      name: "الصحة النفسية — وزارة الصحة السعودية",
      phone: "937",
      tel: "937",
      url: "https://www.moh.gov.sa/",
    },
    {
      name: "Crisis Text Line",
      phone: "أرسل HOME إلى 741741",
      url: "https://www.crisistextline.org/",
    },
  ],
  nb: [
    {
      name: "Mental Helse Hjelpetelefonen",
      phone: "116 123",
      tel: "116123",
      url: "https://mentalhelse.no/fa-hjelp/hjelpetelefonen/",
    },
    {
      name: "Alarmtelefonen for barn og unge",
      phone: "116 111",
      tel: "116111",
      url: "https://www.alarmtelefonen.no/",
    },
    {
      name: "988 Suicide & Crisis Lifeline (US)",
      phone: "988",
      tel: "988",
      url: "https://988lifeline.org/",
    },
  ],
};

export default function SafetyPage() {
  const { moment } = useSession();
  const { lang, t } = useSettings();
  const [status, setStatus] = useState<string | null>(null);
  const helplines = useMemo(() => HELPLINES_BY_LANG[lang] ?? HELPLINES_BY_LANG.en, [lang]);

  usePageTitle(t("safety.title"));

  async function copyScript(which: "person" | "caregiver") {
    const text =
      which === "person" ? moment?.lastScripts?.personScript : moment?.lastScripts?.caregiverScript;
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setStatus(t("scripts.copied"));
    } catch {
      setStatus(t("common.copyFailed"));
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("safety.title")}</h1>

      <div className="sr-only" aria-live="polite">
        {status}
      </div>

      <section className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
        <h2 className="mb-3 text-lg font-semibold">{t("safety.grounding.title")}</h2>
        <p className="mb-3 text-sm text-[var(--color-text-muted)]">
          {t("safety.grounding.subtitle")}
        </p>
        <ul className="space-y-2 text-sm">
          <li>
            <strong>5</strong> {t("safety.grounding.see")}
          </li>
          <li>
            <strong>4</strong> {t("safety.grounding.touch")}
          </li>
          <li>
            <strong>3</strong> {t("safety.grounding.hear")}
          </li>
          <li>
            <strong>2</strong> {t("safety.grounding.smell")}
          </li>
          <li>
            <strong>1</strong> {t("safety.grounding.taste")}
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">{t("safety.helplines.title")}</h2>
        <div className="flex flex-col gap-3">
          {helplines.map((h) => (
            <div
              key={h.name}
              className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
            >
              <p className="font-semibold">{h.name}</p>
              {h.tel ? (
                <a
                  href={`tel:${h.tel}`}
                  className="text-sm font-medium text-[var(--color-primary)] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                >
                  {h.phone}
                </a>
              ) : (
                <p className="text-sm text-[var(--color-primary)]">{h.phone}</p>
              )}
              <a
                href={h.url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex min-h-11 items-center text-sm text-[var(--color-text-muted)] underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              >
                {h.url.replace(/^https?:\/\//, "")}{" "}
                <span className="sr-only">({t("a11y.opensNewTab")})</span>
              </a>
            </div>
          ))}
        </div>
      </section>

      {moment?.lastScripts && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">{t("safety.copy.title")}</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => copyScript("person")}
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              aria-label={t("safety.copy.person")}
            >
              {t("safety.copy.person")}
            </button>
            <button
              type="button"
              onClick={() => copyScript("caregiver")}
              className="min-h-11 rounded-[var(--radius-control)] border border-[var(--color-border)] px-4 py-2 text-sm hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              aria-label={t("safety.copy.caregiver")}
            >
              {t("safety.copy.caregiver")}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
