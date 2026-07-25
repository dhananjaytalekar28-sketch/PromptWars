import { describe, expect, it, vi } from "vitest";
import {
  AppError,
  getHttpStatusForCode,
  isAppError,
  mapProviderError,
  type AppErrorCode,
} from "@/shared/errors/app-error";
import {
  createConsoleLogger,
  createLogger,
  pickLoggerMetadata,
  type LoggerMetadata,
} from "@/shared/logging/logger";

describe("AppError", () => {
  it.each<[AppErrorCode, number]>([
    ["INVALID_REQUEST", 400],
    ["RATE_LIMITED", 429],
    ["TIMEOUT", 504],
    ["CONFIGURATION_ERROR", 503],
    ["PROVIDER_ERROR", 503],
    ["INVALID_PROVIDER_RESPONSE", 503],
  ])("maps %s to HTTP %i", (code, status) => {
    const error = new AppError(code);
    expect(error.code).toBe(code);
    expect(error.status).toBe(status);
    expect(getHttpStatusForCode(code)).toBe(status);
    expect(error.safeMessage).toBeTruthy();
    expect(error.message).toBe(error.safeMessage);
  });

  it("stores an optional cause without exposing it in safeMessage", () => {
    const cause = new Error("provider exploded with secret details");
    const error = new AppError("PROVIDER_ERROR", {
      cause,
      safeMessage: "AI is temporarily unavailable.",
    });

    expect(error.cause).toBe(cause);
    expect(error.safeMessage).toBe("AI is temporarily unavailable.");
    expect(error.safeMessage).not.toContain("secret");
  });

  it("identifies AppError instances", () => {
    expect(isAppError(new AppError("INVALID_REQUEST"))).toBe(true);
    expect(isAppError(new Error("nope"))).toBe(false);
    expect(isAppError(null)).toBe(false);
  });
});

describe("mapProviderError", () => {
  it("returns AppError instances unchanged", () => {
    const original = new AppError("RATE_LIMITED");
    expect(mapProviderError(original)).toBe(original);
  });

  it("maps abort errors to TIMEOUT", () => {
    const abort = new DOMException("The operation was aborted", "AbortError");
    const mapped = mapProviderError(abort);
    expect(mapped.code).toBe("TIMEOUT");
    expect(mapped.status).toBe(504);
  });

  it("maps timeout messages to TIMEOUT", () => {
    const mapped = mapProviderError(new Error("Request timeout after 15000ms"));
    expect(mapped.code).toBe("TIMEOUT");
    expect(mapped.status).toBe(504);
  });

  it("maps rate limit signals to RATE_LIMITED", () => {
    const mapped = mapProviderError({ status: 429, message: "Too Many Requests" });
    expect(mapped.code).toBe("RATE_LIMITED");
    expect(mapped.status).toBe(429);
  });

  it("maps configuration failures to CONFIGURATION_ERROR", () => {
    const mapped = mapProviderError(new Error("GEMINI_API_KEY is not configured"));
    expect(mapped.code).toBe("CONFIGURATION_ERROR");
    expect(mapped.status).toBe(503);
  });

  it("maps malformed JSON to INVALID_PROVIDER_RESPONSE", () => {
    const mapped = mapProviderError(new SyntaxError("Unexpected token"));
    expect(mapped.code).toBe("INVALID_PROVIDER_RESPONSE");
    expect(mapped.status).toBe(503);
  });

  it("maps Error instances named AbortError to TIMEOUT", () => {
    const abort = new Error("aborted");
    abort.name = "AbortError";
    expect(mapProviderError(abort).code).toBe("TIMEOUT");
  });

  it("maps HTTP 401/403 and statusCode fields to CONFIGURATION_ERROR", () => {
    expect(mapProviderError({ status: 401 }).code).toBe("CONFIGURATION_ERROR");
    expect(mapProviderError({ statusCode: 403 }).code).toBe("CONFIGURATION_ERROR");
  });

  it("maps rate-limit messages to RATE_LIMITED", () => {
    expect(mapProviderError({ message: "Rate limit exceeded" }).code).toBe("RATE_LIMITED");
  });

  it("returns empty message for non-error values", () => {
    expect(mapProviderError(null).code).toBe("PROVIDER_ERROR");
    expect(mapProviderError({ message: 123 }).code).toBe("PROVIDER_ERROR");
  });
});

describe("pickLoggerMetadata", () => {
  it("keeps only allowlisted metadata keys", () => {
    expect(
      pickLoggerMetadata({
        action: "intervene",
        code: "PROVIDER_ERROR",
        status: 503,
        durationMs: 42,
        requestId: "req-1",
        prompt: "secret prompt",
        nickname: "Alex",
        token: "sk-secret",
        generatedContent: "sensitive output",
      }),
    ).toEqual({
      action: "intervene",
      code: "PROVIDER_ERROR",
      status: 503,
      durationMs: 42,
      requestId: "req-1",
    });
  });

  it("returns undefined when no allowlisted keys are present", () => {
    expect(pickLoggerMetadata({ prompt: "secret", chips: ["alone"] })).toBeUndefined();
    expect(pickLoggerMetadata()).toBeUndefined();
  });

  it("ignores non-primitive allowlisted values", () => {
    expect(pickLoggerMetadata({ action: { nested: true }, status: 200 })).toEqual({ status: 200 });
  });
});

describe("createLogger", () => {
  it("forwards only sanitized metadata to the sink", () => {
    const calls: Array<{ level: string; message: string; metadata?: LoggerMetadata }> = [];
    const logger = createLogger({
      info: (message, metadata) => calls.push({ level: "info", message, metadata }),
      warn: (message, metadata) => calls.push({ level: "warn", message, metadata }),
      error: (message, metadata) => calls.push({ level: "error", message, metadata }),
    });

    logger.info("hello", {
      action: "scripts",
      requestId: "abc",
      userPrompt: "do not log me",
      apiKey: "sk-secret",
    } as LoggerMetadata & Record<string, unknown>);

    logger.warn("careful", { code: "RATE_LIMITED", status: 429 });
    logger.error("failed", { code: "PROVIDER_ERROR", status: 503 });

    expect(calls).toEqual([
      {
        level: "info",
        message: "hello",
        metadata: { action: "scripts", requestId: "abc" },
      },
      {
        level: "warn",
        message: "careful",
        metadata: { code: "RATE_LIMITED", status: 429 },
      },
      {
        level: "error",
        message: "failed",
        metadata: { code: "PROVIDER_ERROR", status: 503 },
      },
    ]);
  });
});

describe("createConsoleLogger", () => {
  it("logs with and without metadata across all levels", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const logger = createConsoleLogger();

    logger.info("info-only");
    logger.info("info-meta", { action: "learn" });
    logger.warn("warn-only");
    logger.warn("warn-meta", { status: 429 });
    logger.error("error-only");
    logger.error("error-meta", { code: "TIMEOUT" });

    expect(info).toHaveBeenCalledWith("info-only");
    expect(info).toHaveBeenCalledWith("info-meta", { action: "learn" });
    expect(warn).toHaveBeenCalledWith("warn-only");
    expect(warn).toHaveBeenCalledWith("warn-meta", { status: 429 });
    expect(error).toHaveBeenCalledWith("error-only");
    expect(error).toHaveBeenCalledWith("error-meta", { code: "TIMEOUT" });

    info.mockRestore();
    warn.mockRestore();
    error.mockRestore();
  });
});
