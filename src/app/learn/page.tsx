"use client";

import { useSession } from "@/shared/context/session-context";
import { useSettings } from "@/shared/context/settings-context";
import { useAiAction } from "@/features/ai/use-ai-action";
import { LEARN_CARDS, type LearnCard } from "@/features/learning/cards";
import { usePageTitle } from "@/shared/hooks/use-guards";
import { useRef, useState } from "react";

export default function LearnPage() {
  const { moment, updateMoment } = useSession();
  const { t } = useSettings();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [blurbs, setBlurbs] = useState<Record<string, string>>(
    moment?.lastLearnBlurb ? { [moment.lastLearnBlurb.cardId]: moment.lastLearnBlurb.blurb } : {},
  );
  const activeCardRef = useRef<string | null>(null);

  const { state, run } = useAiAction({
    action: "learn",
    initialData: moment?.lastLearnBlurb ? { blurb: moment.lastLearnBlurb.blurb } : null,
    onSuccess: (data) => {
      const cardId = activeCardRef.current;
      if (!cardId) return;
      setBlurbs((prev) => ({ ...prev, [cardId]: data.blurb }));
      updateMoment({ lastLearnBlurb: { cardId, blurb: data.blurb, at: new Date().toISOString() } });
    },
  });

  usePageTitle(t("learn.title"));

  const error = state.error?.safeMessage ?? null;
  const status =
    state.status === "loading"
      ? t("ai.status.generating")
      : state.status === "success"
        ? t("ai.status.ready")
        : null;

  async function personalize(card: LearnCard) {
    if (!moment) return;
    activeCardRef.current = card.id;
    setActiveCardId(card.id);
    await run({
      riskLevel: moment.riskLevel,
      chips: moment.chips,
      cardId: card.id,
    });
    setActiveCardId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">{t("learn.title")}</h1>
      <p className="text-[var(--color-text-muted)]">{t("learn.subtitle")}</p>

      <div className="sr-only" aria-live="polite">
        {status}
      </div>

      <div className="flex flex-col gap-4">
        {LEARN_CARDS.map((card) => (
          <article
            key={card.id}
            className="rounded-[var(--radius)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
          >
            <button
              type="button"
              onClick={() => setExpandedCard(expandedCard === card.id ? null : card.id)}
              className="flex w-full min-h-11 items-center gap-3 rounded-[var(--radius-control)] text-start focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)]"
              aria-expanded={expandedCard === card.id}
            >
              <span className="text-2xl" aria-hidden="true">
                {card.emoji}
              </span>
              <div>
                <p className="font-semibold">{card.title}</p>
                <p className="text-sm text-[var(--color-text-muted)]">{card.summary}</p>
              </div>
            </button>

            {expandedCard === card.id && (
              <div className="mt-3 ps-10">
                <p className="text-sm">{card.content}</p>

                {blurbs[card.id] && (
                  <div className="mt-3 rounded-[var(--radius-control)] bg-[var(--color-chip-bg)] p-3 text-sm">
                    <p className="mb-1 font-medium text-[var(--color-primary)]">
                      {t("learn.whymatters")}
                    </p>
                    <p>{blurbs[card.id]}</p>
                  </div>
                )}

                {moment ? (
                  <button
                    type="button"
                    onClick={() => personalize(card)}
                    disabled={activeCardId === card.id && state.status === "loading"}
                    className="mt-3 min-h-11 rounded-[var(--radius-control)] border border-[var(--color-primary)] px-4 py-2 text-sm text-[var(--color-primary)] hover:bg-[var(--color-chip-bg)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus-ring)] disabled:opacity-40"
                  >
                    {activeCardId === card.id && state.status === "loading"
                      ? t("learn.personalizing")
                      : t("learn.personalize")}
                  </button>
                ) : (
                  <p className="mt-2 text-xs text-[var(--color-text-muted)]">
                    {t("learn.checkin.required")}
                  </p>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-[var(--radius)] bg-red-100 p-3 text-sm text-[var(--color-danger)] dark:bg-red-950"
        >
          {error}
        </div>
      )}
    </div>
  );
}
