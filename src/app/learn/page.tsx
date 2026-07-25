"use client";

import { useApp } from "@/context/AppContext";
import { useState } from "react";
import { LEARN_CARDS, type LearnCard } from "@/lib/learn-cards";

export default function LearnPage() {
  const { moment, updateMoment, t } = useApp();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [personalizing, setPersonalizing] = useState<string | null>(null);
  const [blurbs, setBlurbs] = useState<Record<string, string>>(
    moment?.lastLearnBlurb ? { [moment.lastLearnBlurb.cardId]: moment.lastLearnBlurb.blurb } : {}
  );
  const [error, setError] = useState<string | null>(null);

  async function personalize(card: LearnCard) {
    if (!moment) return;
    setPersonalizing(card.id);
    setError(null);
    try {
      const res = await fetch("/api/learn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          riskLevel: moment.riskLevel,
          chips: moment.chips,
          cardId: card.id,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Request failed");
      }
      const data = await res.json();
      setBlurbs((prev) => ({ ...prev, [card.id]: data.blurb }));
      updateMoment({ lastLearnBlurb: { cardId: card.id, blurb: data.blurb, at: new Date().toISOString() } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setPersonalizing(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("learn.title")}</h1>
      <p className="text-[var(--color-text-muted)]">{t("learn.subtitle")}</p>

      <div className="flex flex-col gap-4">
        {LEARN_CARDS.map((card) => (
          <article
            key={card.id}
            className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]"
          >
            <button
              onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
              className="w-full text-start flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] rounded"
              aria-expanded={expandedCard === card.id}
            >
              <span className="text-2xl">{card.emoji}</span>
              <div>
                <p className="font-semibold">{card.title}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{card.summary}</p>
              </div>
            </button>

            {expandedCard === card.id && (
              <div className="mt-3 ps-10">
                <p className="text-sm">{card.content}</p>

                {blurbs[card.id] && (
                  <div className="mt-3 p-3 rounded-lg bg-[var(--color-chip-bg)] text-sm">
                    <p className="font-medium text-[var(--color-primary)] mb-1">{t("learn.whymatters")}</p>
                    <p>{blurbs[card.id]}</p>
                  </div>
                )}

                {moment && (
                  <button
                    onClick={() => personalize(card)}
                    disabled={personalizing === card.id}
                    className="mt-3 px-4 py-2 text-sm rounded-full border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-chip-bg)] disabled:opacity-40 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
                  >
                    {personalizing === card.id ? t("learn.personalizing") : `✨ ${t("learn.personalize")}`}
                  </button>
                )}

                {!moment && (
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">{t("learn.checkin.required")}</p>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {error && (
        <div role="alert" className="p-3 rounded-lg bg-red-100 dark:bg-red-950 text-[var(--color-danger)] text-sm">
          {error}
        </div>
      )}
    </div>
  );
}
