import { z } from "zod";
import { ALLOWED_CHIPS } from "./types";

export const momentPayloadSchema = z.object({
  riskLevel: z.number().int().min(1).max(5),
  chips: z.array(z.enum(ALLOWED_CHIPS)).min(1).max(9),
  voiceOrTextNote: z.string().max(500).optional(),
});

export const learnPayloadSchema = z.object({
  riskLevel: z.number().int().min(1).max(5),
  chips: z.array(z.enum(ALLOWED_CHIPS)).min(1).max(9),
  cardId: z.string().min(1).max(50),
});

export type MomentPayload = z.infer<typeof momentPayloadSchema>;
export type LearnPayload = z.infer<typeof learnPayloadSchema>;
