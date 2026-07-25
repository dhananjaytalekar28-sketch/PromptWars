import { z } from "zod";
import type { AiAction, AiRequestByAction, AiResult } from "./contracts";
import {
  briefingResponseSchema,
  interventionResponseSchema,
  learnResponseSchema,
  scriptsResponseSchema,
} from "./schemas";
import { AppError, type AppErrorCode, mapProviderError } from "@/shared/errors/app-error";

const errorEnvelopeSchema = z
  .object({
    error: z
      .object({
        code: z.string(),
        message: z.string(),
      })
      .strict(),
  })
  .strict();

const RESPONSE_SCHEMA_BY_ACTION = {
  intervene: interventionResponseSchema,
  scripts: scriptsResponseSchema,
  briefing: briefingResponseSchema,
  learn: learnResponseSchema,
} as const;

const APP_ERROR_CODES = new Set<string>([
  "INVALID_REQUEST",
  "CONFIGURATION_ERROR",
  "RATE_LIMITED",
  "TIMEOUT",
  "PROVIDER_ERROR",
  "INVALID_PROVIDER_RESPONSE",
]);

function isAppErrorCode(code: string): code is AppErrorCode {
  return APP_ERROR_CODES.has(code);
}

function parseErrorEnvelope(raw: unknown): AppError {
  const parsed = errorEnvelopeSchema.safeParse(raw);
  if (!parsed.success) {
    return new AppError("PROVIDER_ERROR");
  }

  const { code, message } = parsed.data.error;
  if (isAppErrorCode(code)) {
    return new AppError(code, { safeMessage: message });
  }

  return new AppError("PROVIDER_ERROR", { safeMessage: message });
}

export async function requestAi<A extends AiAction>(
  action: A,
  input: AiRequestByAction[A],
  options: { signal: AbortSignal },
): Promise<AiResult<A>> {
  const { signal } = options;

  try {
    const response = await fetch(`/api/ai/${action}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(input),
      signal,
    });

    const raw = (await response.json()) as unknown;

    if (!response.ok) {
      throw parseErrorEnvelope(raw);
    }

    const responseSchema = RESPONSE_SCHEMA_BY_ACTION[action];
    const envelopeSchema = z.object({ data: z.unknown() }).strict();
    const parsed = envelopeSchema.safeParse(raw);

    if (!parsed.success) {
      throw new AppError("INVALID_PROVIDER_RESPONSE", { cause: parsed.error });
    }

    const dataParsed = responseSchema.safeParse(parsed.data.data);
    if (!dataParsed.success) {
      throw new AppError("INVALID_PROVIDER_RESPONSE", { cause: dataParsed.error });
    }

    return dataParsed.data as AiResult<A>;
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw mapProviderError(error);
  }
}
