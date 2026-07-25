import { describe, expect, it } from "vitest";
import { AI_ACTIONS } from "@/features/ai/prompts";
import type { LearnPayload, MomentPayload } from "@/features/check-in/types";

const momentPayload: MomentPayload = {
  riskLevel: 4,
  chips: ["alone", "anxious"],
};

const momentWithNote: MomentPayload = {
  ...momentPayload,
  voiceOrTextNote: "Need to leave soon",
};

const learnPayload: LearnPayload = {
  riskLevel: 3,
  chips: ["craving"],
  cardId: "urge-surfing",
};

function expectNoUndefinedText(prompt: string): void {
  expect(prompt).not.toMatch(/\bundefined\b/i);
  expect(prompt).not.toContain("undefined");
}

describe("AI user prompts", () => {
  it("intervene includes risk and chips, omits note when absent", () => {
    const prompt = AI_ACTIONS.intervene.buildUserPrompt(momentPayload);

    expect(prompt).toContain("urge intensity 4/5");
    expect(prompt).toContain("alone, anxious");
    expect(prompt).not.toContain("Additional context:");
    expect(prompt).toContain("Give me steps to get through this moment.");
    expectNoUndefinedText(prompt);
  });

  it("intervene includes optional note only when present", () => {
    const prompt = AI_ACTIONS.intervene.buildUserPrompt(momentWithNote);

    expect(prompt).toContain("Additional context: Need to leave soon");
    expectNoUndefinedText(prompt);
  });

  it("scripts includes risk and chips, omits note when absent", () => {
    const prompt = AI_ACTIONS.scripts.buildUserPrompt(momentPayload);

    expect(prompt).toContain("urge intensity 4/5");
    expect(prompt).toContain("alone, anxious");
    expect(prompt).not.toContain("Context:");
    expect(prompt).toContain("Generate dual emergency scripts");
    expectNoUndefinedText(prompt);
  });

  it("scripts includes optional note only when present", () => {
    const prompt = AI_ACTIONS.scripts.buildUserPrompt(momentWithNote);

    expect(prompt).toContain("Context: Need to leave soon");
    expectNoUndefinedText(prompt);
  });

  it("briefing includes risk and chips, omits note when absent", () => {
    const prompt = AI_ACTIONS.briefing.buildUserPrompt(momentPayload);

    expect(prompt).toContain("urge intensity 4/5");
    expect(prompt).toContain("alone, anxious");
    expect(prompt).not.toContain("They also said:");
    expect(prompt).toContain("Help me understand what they're going through");
    expectNoUndefinedText(prompt);
  });

  it("briefing includes optional note only when present", () => {
    const prompt = AI_ACTIONS.briefing.buildUserPrompt(momentWithNote);

    expect(prompt).toContain("They also said: Need to leave soon");
    expectNoUndefinedText(prompt);
  });

  it("learn includes risk, chips, and card id", () => {
    const prompt = AI_ACTIONS.learn.buildUserPrompt(learnPayload);

    expect(prompt).toContain("urge intensity 3/5");
    expect(prompt).toContain("craving");
    expect(prompt).toContain('"urge-surfing"');
    expect(prompt).toContain("Explain why this concept matters");
    expectNoUndefinedText(prompt);
  });
});

describe("AI system prompts", () => {
  it("preserves behaviorally equivalent coaching instructions", () => {
    expect(AI_ACTIONS.intervene.systemPrompt).toContain(
      "supportive, non-judgmental recovery coach",
    );
    expect(AI_ACTIONS.intervene.systemPrompt).toContain("3-5 steps");

    expect(AI_ACTIONS.scripts.systemPrompt).toContain("person script");
    expect(AI_ACTIONS.scripts.systemPrompt).toContain("caregiver script");

    expect(AI_ACTIONS.briefing.systemPrompt).toContain("caregivers understand");
    expect(AI_ACTIONS.briefing.systemPrompt).toContain("doSay");

    expect(AI_ACTIONS.learn.systemPrompt).toContain("educational coach");
    expect(AI_ACTIONS.learn.systemPrompt).toContain("blurb");
  });
});
