import type { z } from "zod";
import { allowedChips, learnPayloadSchema, momentPayloadSchema, momentSchema } from "./schemas";

export type ChipId = (typeof allowedChips)[number];
export type Moment = z.infer<typeof momentSchema>;
export type MomentPayload = z.infer<typeof momentPayloadSchema>;
export type LearnPayload = z.infer<typeof learnPayloadSchema>;
