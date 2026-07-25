import { z } from "zod";

export const allowedChips = [
  "craving",
  "triggered",
  "alone",
  "with-people",
  "after-slip",
  "anxious",
  "angry",
  "tired",
  "need-to-leave",
] as const;

const chipSchema = z.enum(allowedChips);
const boundedText = z.string().trim().min(1).max(2_000);
/** Inferred as `1 | 2 | 3 | 4 | 5`; literals also reject non-integers at runtime. */
const riskLevelSchema = z.literal([1, 2, 3, 4, 5]);

export const interventionSchema = z
  .object({
    steps: z
      .array(
        z
          .object({
            title: boundedText.max(120),
            body: boundedText,
          })
          .strict(),
      )
      .min(3)
      .max(5),
    at: z.iso.datetime(),
  })
  .strict();

export const scriptsSchema = z
  .object({
    personScript: boundedText,
    caregiverScript: boundedText,
    at: z.iso.datetime(),
  })
  .strict();

export const briefingSchema = z
  .object({
    briefing: boundedText,
    doSay: z.array(boundedText.max(300)).min(3).max(5),
    dontSay: z.array(boundedText.max(300)).min(3).max(5),
    at: z.iso.datetime(),
  })
  .strict();

export const learnBlurbSchema = z
  .object({
    cardId: z.string().trim().min(1).max(50),
    blurb: boundedText,
    at: z.iso.datetime(),
  })
  .strict();

export const momentSchema = z
  .object({
    id: z.string().trim().min(1),
    updatedAt: z.iso.datetime(),
    riskLevel: riskLevelSchema,
    chips: z.array(chipSchema).min(1).max(9),
    voiceOrTextNote: z.string().max(500).optional(),
    lastIntervention: interventionSchema.optional(),
    lastScripts: scriptsSchema.optional(),
    lastBriefing: briefingSchema.optional(),
    lastLearnBlurb: learnBlurbSchema.optional(),
  })
  .strict();

export const momentPayloadSchema = z
  .object({
    riskLevel: riskLevelSchema,
    chips: z.array(chipSchema).min(1).max(9),
    voiceOrTextNote: z.string().max(500).optional(),
  })
  .strict();

export const learnPayloadSchema = z
  .object({
    riskLevel: riskLevelSchema,
    chips: z.array(chipSchema).min(1).max(9),
    cardId: z.string().min(1).max(50),
  })
  .strict();
