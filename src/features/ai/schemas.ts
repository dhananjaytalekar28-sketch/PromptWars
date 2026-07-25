import { z } from "zod";

const boundedText = z.string().trim().min(1).max(2_000);

export const interventionResponseSchema = z
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
  })
  .strict();

export const scriptsResponseSchema = z
  .object({
    personScript: boundedText,
    caregiverScript: boundedText,
  })
  .strict();

export const briefingResponseSchema = z
  .object({
    briefing: boundedText,
    doSay: z.array(boundedText.max(300)).min(3).max(5),
    dontSay: z.array(boundedText.max(300)).min(3).max(5),
  })
  .strict();

export const learnResponseSchema = z
  .object({
    blurb: boundedText,
  })
  .strict();

export type InterventionResponse = z.infer<typeof interventionResponseSchema>;
export type ScriptsResponse = z.infer<typeof scriptsResponseSchema>;
export type BriefingResponse = z.infer<typeof briefingResponseSchema>;
export type LearnResponse = z.infer<typeof learnResponseSchema>;
