import "server-only";

import { executeAiAction } from "@/features/ai/service";
import type { AiAction, AiProvider } from "@/features/ai/contracts";
import { createAiProvider } from "@/features/ai/providers/create-ai-provider";
import {
  createRateLimiter,
  deriveRateLimitIdentifier,
  type RateLimiter,
} from "@/features/ai/rate-limit";
import { AppError, isAppError } from "@/shared/errors/app-error";
import { getServerConfig, type ServerConfig } from "@/shared/config/server";
import { createConsoleLogger, type Logger } from "@/shared/logging/logger";

export const MAX_REQUEST_BODY_BYTES = 4_096;

const JSON_CONTENT_TYPE = "application/json";

interface ErrorEnvelope {
  readonly error: {
    readonly code: string;
    readonly message: string;
  };
}

interface SuccessEnvelope<T> {
  readonly data: T;
}

export interface AiRouteHandlerDependencies {
  readonly provider?: AiProvider;
  readonly rateLimiter?: RateLimiter;
  readonly logger?: Logger;
  readonly getServerConfig?: () => ServerConfig;
}

function isJsonContentType(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }

  const [mediaType] = contentType.split(";");
  return mediaType?.trim().toLowerCase() === JSON_CONTENT_TYPE;
}

function getRequestId(request: Request): string {
  return request.headers.get("x-request-id")?.trim() || crypto.randomUUID();
}

function jsonResponse(
  body: SuccessEnvelope<unknown> | ErrorEnvelope,
  status: number,
  headers?: HeadersInit,
): Response {
  return Response.json(body, { status, headers });
}

function payloadTooLargeResponse(): Response {
  return jsonResponse(
    {
      error: {
        code: "PAYLOAD_TOO_LARGE",
        message: "Request body is too large.",
      },
    },
    413,
  );
}

function appErrorResponse(error: AppError, headers?: HeadersInit): Response {
  return jsonResponse(
    {
      error: {
        code: error.code,
        message: error.safeMessage,
      },
    },
    error.status,
    headers,
  );
}

class PayloadTooLargeError extends Error {
  constructor() {
    super("Request body is too large.");
    this.name = "PayloadTooLargeError";
  }
}

async function readBoundedBody(request: Request, maxBytes: number): Promise<string> {
  const contentLengthHeader = request.headers.get("content-length");
  if (contentLengthHeader) {
    const contentLength = Number.parseInt(contentLengthHeader, 10);
    if (!Number.isNaN(contentLength) && contentLength > maxBytes) {
      throw new PayloadTooLargeError();
    }
  }

  if (!request.body) {
    return "";
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    if (!value) {
      continue;
    }

    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new PayloadTooLargeError();
    }

    chunks.push(value);
  }

  const combined = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8", { fatal: true }).decode(combined);
}

function parseJsonBody(rawBody: string): unknown {
  if (!rawBody.trim()) {
    throw new AppError("INVALID_REQUEST");
  }

  try {
    return JSON.parse(rawBody) as unknown;
  } catch (error) {
    throw new AppError("INVALID_REQUEST", { cause: error });
  }
}

export function createAiRouteHandler(
  action: AiAction,
  dependencies: AiRouteHandlerDependencies = {},
): (request: Request) => Promise<Response> {
  return async (request: Request): Promise<Response> => {
    const requestId = getRequestId(request);
    const logger = dependencies.logger ?? createConsoleLogger();

    try {
      if (!isJsonContentType(request.headers.get("content-type"))) {
        throw new AppError("INVALID_REQUEST");
      }

      const rawBody = await readBoundedBody(request, MAX_REQUEST_BODY_BYTES);
      const parsedBody = parseJsonBody(rawBody);
      const rateLimiter = dependencies.rateLimiter ?? createRateLimiter();
      const identifier = deriveRateLimitIdentifier(request);
      const rateLimit = await rateLimiter.check(identifier);

      if (!rateLimit.allowed) {
        const error = new AppError("RATE_LIMITED");
        logger.warn("ai.route.rate_limited", {
          action,
          code: error.code,
          status: error.status,
          requestId,
        });
        return appErrorResponse(error, {
          "Retry-After": String(rateLimit.retryAfterSeconds),
        });
      }

      const config = dependencies.getServerConfig?.() ?? getServerConfig();
      const provider = dependencies.provider ?? createAiProvider(config);
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), config.aiTimeoutMs);

      try {
        const data = await executeAiAction(action, parsedBody, {
          provider,
          signal: abortController.signal,
          logger: {
            info(message, metadata) {
              logger.info(message, { ...metadata, requestId });
            },
            warn(message, metadata) {
              logger.warn(message, { ...metadata, requestId });
            },
            error(message, metadata) {
              logger.error(message, { ...metadata, requestId });
            },
          },
        });

        return jsonResponse({ data }, 200);
      } finally {
        clearTimeout(timeoutId);
      }
    } catch (error) {
      if (error instanceof PayloadTooLargeError) {
        return payloadTooLargeResponse();
      }

      if (isAppError(error)) {
        if (error.code !== "RATE_LIMITED") {
          logger.error("ai.route.failed", {
            action,
            code: error.code,
            status: error.status,
            requestId,
          });
        }

        return appErrorResponse(error);
      }

      const fallback = new AppError("PROVIDER_ERROR", { cause: error });
      logger.error("ai.route.failed", {
        action,
        code: fallback.code,
        status: fallback.status,
        requestId,
      });
      return appErrorResponse(fallback);
    }
  };
}
