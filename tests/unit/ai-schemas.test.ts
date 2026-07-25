import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import type { AiAction, AiResult } from "@/features/ai/contracts";
import { AI_ACTIONS } from "@/features/ai/prompts";
import {
  briefingResponseSchema,
  interventionResponseSchema,
  learnResponseSchema,
  scriptsResponseSchema,
} from "@/features/ai/schemas";
import { learnPayloadSchema, momentPayloadSchema } from "@/features/check-in/schemas";

const validIntervention = {
  steps: [
    { title: "Breathe", body: "Take five slow breaths." },
    { title: "Ground", body: "Name five things you can see." },
    { title: "Reach out", body: "Text your support person." },
  ],
};

const validScripts = {
  personScript: "You can ride this wave. Stay with your breath.",
  caregiverScript: "Stay calm and present. Offer quiet support.",
};

const validBriefing = {
  briefing: "They may feel overwhelmed and need quiet support.",
  doSay: ["I am here.", "You are safe.", "We can take this minute by minute."],
  dontSay: ["Just get over it.", "You always do this.", "This is your fault."],
};

const validLearn = {
  blurb: "Urge surfing fits because the craving is peaking while you are alone.",
};

describe("AI response schemas", () => {
  it("accepts valid model shapes", () => {
    expect(interventionResponseSchema.safeParse(validIntervention).success).toBe(true);
    expect(scriptsResponseSchema.safeParse(validScripts).success).toBe(true);
    expect(briefingResponseSchema.safeParse(validBriefing).success).toBe(true);
    expect(learnResponseSchema.safeParse(validLearn).success).toBe(true);
  });

  it("rejects malformed model shapes", () => {
    expect(interventionResponseSchema.safeParse({ steps: [] }).success).toBe(false);
    expect(
      interventionResponseSchema.safeParse({ steps: validIntervention.steps, extra: true }).success,
    ).toBe(false);
    expect(scriptsResponseSchema.safeParse({ personScript: "" }).success).toBe(false);
    expect(briefingResponseSchema.safeParse({ ...validBriefing, doSay: ["one"] }).success).toBe(
      false,
    );
    expect(learnResponseSchema.safeParse({ blurb: "" }).success).toBe(false);
  });

  it("converts response schemas to JSON Schema for provider boundaries", () => {
    for (const action of ["intervene", "scripts", "briefing", "learn"] as const) {
      const jsonSchema = z.toJSONSchema(AI_ACTIONS[action].responseSchema);
      expect(jsonSchema).toBeTypeOf("object");
      expect(jsonSchema).toHaveProperty("type");
    }
  });
});

describe("AI action request schemas", () => {
  it("validates moment payloads for intervene, scripts, and briefing", () => {
    const payload = { riskLevel: 3, chips: ["alone"] };
    expect(AI_ACTIONS.intervene.requestSchema.safeParse(payload).success).toBe(true);
    expect(AI_ACTIONS.scripts.requestSchema.safeParse(payload).success).toBe(true);
    expect(AI_ACTIONS.briefing.requestSchema.safeParse(payload).success).toBe(true);
    expect(momentPayloadSchema.safeParse(payload).success).toBe(true);
  });

  it("validates learn payloads and rejects empty cardId", () => {
    expect(
      AI_ACTIONS.learn.requestSchema.safeParse({
        riskLevel: 3,
        chips: ["alone"],
        cardId: "urge-surfing",
      }).success,
    ).toBe(true);
    expect(
      learnPayloadSchema.safeParse({ riskLevel: 3, chips: ["alone"], cardId: "" }).success,
    ).toBe(false);
  });
});

describe("AI contracts", () => {
  it("maps AiResult to the correct response type per action", () => {
    expectTypeOf<AiResult<"intervene">>().toEqualTypeOf<
      z.infer<typeof interventionResponseSchema>
    >();
    expectTypeOf<AiResult<"scripts">>().toEqualTypeOf<z.infer<typeof scriptsResponseSchema>>();
    expectTypeOf<AiResult<"briefing">>().toEqualTypeOf<z.infer<typeof briefingResponseSchema>>();
    expectTypeOf<AiResult<"learn">>().toEqualTypeOf<z.infer<typeof learnResponseSchema>>();

    const actions: AiAction[] = ["intervene", "scripts", "briefing", "learn"];
    expect(actions).toHaveLength(4);
  });
});
