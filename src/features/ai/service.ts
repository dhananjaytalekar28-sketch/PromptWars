import "server-only";

import { z } from "zod";
import { AppError, isAppError, mapProviderError } from "@/shared/errors/app-error";
import type { Logger } from "@/shared/logging/logger";
import type { AiAction, AiProvider, AiResult } from "./contracts";
import { AI_ACTIONS } from "./prompts";

function elapsedMs(start: number): number {
  return Math.round(performance.now() - start);
}

function logFailure(logger: Logger, action: AiAction, error: AppError, start: number): void {
  logger.error("ai.action.failed", {
    action,
    code: error.code,
    status: error.status,
    durationMs: elapsedMs(start),
  });
}

export async function executeAiAction<A extends AiAction>(
  action: A,
  rawInput: unknown,
  dependencies: { provider: AiProvider; signal: AbortSignal; logger: Logger },
): Promise<AiResult<A>> {
  const { provider, signal, logger } = dependencies;
  const definition = AI_ACTIONS[action];
  const start = performance.now();

  const parsedInput = definition.requestSchema.safeParse(rawInput);
  if (!parsedInput.success) {
    const error = new AppError("INVALID_REQUEST", { cause: parsedInput.error });
    logFailure(logger, action, error, start);
    throw error;
  }

  try {
    const rawResponse = await provider.generateJson({
      systemPrompt: definition.systemPrompt,
      userPrompt: definition.buildUserPrompt(parsedInput.data as never),
      responseJsonSchema: z.toJSONSchema(definition.responseSchema),
      signal,
    });

    const parsedResponse = definition.responseSchema.safeParse(rawResponse);
    if (!parsedResponse.success) {
      const error = new AppError("INVALID_PROVIDER_RESPONSE", { cause: parsedResponse.error });
      logFailure(logger, action, error, start);
      throw error;
    }

    logger.info("ai.action.completed", {
      action,
      status: 200,
      durationMs: elapsedMs(start),
    });

    return parsedResponse.data as AiResult<A>;
  } catch (error) {
    if (isAppError(error)) {
      throw error;
    }

    const appError = mapProviderError(error);
    logFailure(logger, action, appError, start);
    throw appError;
  }
}
