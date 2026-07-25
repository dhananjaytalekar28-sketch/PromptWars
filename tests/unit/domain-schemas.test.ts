import { describe, expect, expectTypeOf, it } from "vitest";
import { learnPayloadSchema, momentPayloadSchema, momentSchema } from "@/features/check-in/schemas";
import type { Moment, MomentPayload } from "@/features/check-in/types";
import { profileSchema } from "@/features/profile/schemas";

const validMoment = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  updatedAt: "2026-07-25T06:30:00.000Z",
  riskLevel: 3,
  chips: ["alone", "anxious"] as const,
  voiceOrTextNote: "Feeling shaky",
  lastIntervention: {
    steps: [
      { title: "Breathe", body: "Take five slow breaths." },
      { title: "Ground", body: "Name five things you can see." },
      { title: "Reach out", body: "Text your support person." },
    ],
    at: "2026-07-25T06:31:00.000Z",
  },
  lastScripts: {
    personScript: "You can ride this wave.",
    caregiverScript: "Stay calm and present.",
    at: "2026-07-25T06:32:00.000Z",
  },
  lastBriefing: {
    briefing: "They may feel overwhelmed and need quiet support.",
    doSay: ["I am here.", "You are safe.", "We can take this minute by minute."],
    dontSay: ["Just get over it.", "You always do this.", "This is your fault."],
    at: "2026-07-25T06:33:00.000Z",
  },
  lastLearnBlurb: {
    cardId: "urge-surfing",
    blurb: "Urge surfing fits because the craving is peaking while you are alone.",
    at: "2026-07-25T06:34:00.000Z",
  },
};

describe("domain schemas", () => {
  it("accepts a valid profile and rejects unknown roles", () => {
    expect(profileSchema.safeParse({ role: "person", nickname: "A" }).success).toBe(true);
    expect(profileSchema.safeParse({ role: "admin" }).success).toBe(false);
  });

  it("accepts a valid moment and rejects invalid risk or chips", () => {
    expect(momentSchema.safeParse(validMoment).success).toBe(true);
    expect(momentSchema.safeParse({ ...validMoment, riskLevel: 6 }).success).toBe(false);
    expect(momentSchema.safeParse({ ...validMoment, chips: ["unknown"] }).success).toBe(false);
  });

  it("rejects empty chips on moment payloads and empty cardId on learn payloads", () => {
    expect(momentPayloadSchema.safeParse({ riskLevel: 3, chips: [] }).success).toBe(false);
    expect(
      learnPayloadSchema.safeParse({ riskLevel: 3, chips: ["alone"], cardId: "" }).success,
    ).toBe(false);
  });

  it("keeps riskLevel as the literal union 1|2|3|4|5 at the type level", () => {
    expectTypeOf<Moment["riskLevel"]>().toEqualTypeOf<1 | 2 | 3 | 4 | 5>();
    expectTypeOf<MomentPayload["riskLevel"]>().toEqualTypeOf<1 | 2 | 3 | 4 | 5>();

    // Explicit assignment: Moment["riskLevel"] must be assignable to the literal union.
    const assigned: 1 | 2 | 3 | 4 | 5 = 3 as Moment["riskLevel"];
    expect(assigned).toBe(3);

    // Widening back to number must not be assignable without narrowing (fails typecheck if schema widens).
    // @ts-expect-error plain number is not assignable to riskLevel literal union
    const widened: Moment["riskLevel"] = 3 as number;
    void widened;
  });

  it("accepts riskLevel boundaries 1 and 5 and rejects 0, 6, and non-integers", () => {
    expect(momentPayloadSchema.safeParse({ riskLevel: 1, chips: ["alone"] }).success).toBe(true);
    expect(momentPayloadSchema.safeParse({ riskLevel: 5, chips: ["alone"] }).success).toBe(true);
    expect(momentPayloadSchema.safeParse({ riskLevel: 0, chips: ["alone"] }).success).toBe(false);
    expect(momentPayloadSchema.safeParse({ riskLevel: 6, chips: ["alone"] }).success).toBe(false);
    expect(momentPayloadSchema.safeParse({ riskLevel: 3.5, chips: ["alone"] }).success).toBe(false);
    expect(momentSchema.safeParse({ ...validMoment, riskLevel: 1 }).success).toBe(true);
    expect(momentSchema.safeParse({ ...validMoment, riskLevel: 5 }).success).toBe(true);
    expect(momentSchema.safeParse({ ...validMoment, riskLevel: 0 }).success).toBe(false);
  });
});
