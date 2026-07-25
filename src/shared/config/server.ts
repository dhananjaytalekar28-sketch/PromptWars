import "server-only";

import { z } from "zod";

const MIN_AI_TIMEOUT_MS = 1_000;
const MAX_AI_TIMEOUT_MS = 120_000;
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_AI_TIMEOUT_MS = 15_000;

const serverEnvSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1, "GEMINI_API_KEY is required"),
  GEMINI_MODEL: z.string().trim().min(1),
  AI_TIMEOUT_MS: z.coerce.number().int().min(MIN_AI_TIMEOUT_MS).max(MAX_AI_TIMEOUT_MS),
});

export interface ServerConfig {
  readonly geminiApiKey: string;
  readonly geminiModel: string;
  readonly aiTimeoutMs: number;
}

export function getServerConfig(): ServerConfig {
  const parsed = serverEnvSchema.parse({
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_MODEL: process.env.GEMINI_MODEL ?? DEFAULT_GEMINI_MODEL,
    AI_TIMEOUT_MS: process.env.AI_TIMEOUT_MS ?? String(DEFAULT_AI_TIMEOUT_MS),
  });

  return {
    geminiApiKey: parsed.GEMINI_API_KEY,
    geminiModel: parsed.GEMINI_MODEL,
    aiTimeoutMs: parsed.AI_TIMEOUT_MS,
  };
}
