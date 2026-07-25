import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { AiProvider } from "@/features/ai/contracts";
import { interventionResponseSchema } from "@/features/ai/schemas";
import { AppError } from "@/shared/errors/app-error";
import { createLogger, type LoggerMetadata } from "@/shared/logging/logger";

vi.mock("server-only", () => ({}));

const validIntervention = {
  steps: [
    { title: "Breathe", body: "Take five slow breaths." },
    { title: "Ground", body: "Name five things you can see." },
    { title: "Reach out", body: "Text your support person." },
  ],
};

const sensitiveMomentInput = {
  riskLevel: 4,
  chips: ["craving", "alone"],
  voiceOrTextNote: "SECRET_RECOVERY_CONTEXT_AND_NICKNAME",
};

function createTestLogger() {
  const entries: Array<{
    level: "info" | "warn" | "error";
    message: string;
    metadata?: LoggerMetadata;
  }> = [];
  const logger = createLogger({
    info: (message, metadata) => entries.push({ level: "info", message, metadata }),
    warn: (message, metadata) => entries.push({ level: "warn", message, metadata }),
    error: (message, metadata) => entries.push({ level: "error", message, metadata }),
  });
  return { logger, entries };
}

function createProvider(response: unknown): AiProvider {
  return {
    generateJson: vi.fn().mockResolvedValue(response),
  };
}

describe("executeAiAction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("validates input, calls provider with JSON schema, and returns parsed data", async () => {
    const provider = createProvider(validIntervention);
    const { logger } = createTestLogger();
    const { executeAiAction } = await import("@/features/ai/service");

    const result = await executeAiAction("intervene", sensitiveMomentInput, {
      provider,
      signal: new AbortController().signal,
      logger,
    });

    expect(result).toEqual(validIntervention);
    expect(provider.generateJson).toHaveBeenCalledOnce();

    const call = vi.mocked(provider.generateJson).mock.calls[0]?.[0];
    expect(call?.systemPrompt).toContain("recovery coach");
    expect(call?.userPrompt).toContain("SECRET_RECOVERY_CONTEXT_AND_NICKNAME");
    expect(call?.responseJsonSchema).toEqual(z.toJSONSchema(interventionResponseSchema));
    expect(call?.signal).toBeInstanceOf(AbortSignal);
  });

  it("rejects invalid request input with INVALID_REQUEST", async () => {
    const provider = createProvider(validIntervention);
    const { logger } = createTestLogger();
    const { executeAiAction } = await import("@/features/ai/service");

    await expect(
      executeAiAction(
        "intervene",
        { riskLevel: 9, chips: [] },
        { provider, signal: new AbortController().signal, logger },
      ),
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      status: 400,
    });

    expect(provider.generateJson).not.toHaveBeenCalled();
  });

  it("rejects malformed provider output with INVALID_PROVIDER_RESPONSE", async () => {
    const provider = createProvider({ steps: [] });
    const { logger } = createTestLogger();
    const { executeAiAction } = await import("@/features/ai/service");

    await expect(
      executeAiAction("intervene", sensitiveMomentInput, {
        provider,
        signal: new AbortController().signal,
        logger,
      }),
    ).rejects.toMatchObject({
      code: "INVALID_PROVIDER_RESPONSE",
      status: 503,
    });
  });

  it("maps provider exceptions to safe AppError codes", async () => {
    const { logger } = createTestLogger();
    const { executeAiAction } = await import("@/features/ai/service");

    const rateLimitedProvider: AiProvider = {
      generateJson: vi.fn().mockRejectedValue({ status: 429, message: "Too Many Requests" }),
    };

    await expect(
      executeAiAction("intervene", sensitiveMomentInput, {
        provider: rateLimitedProvider,
        signal: new AbortController().signal,
        logger,
      }),
    ).rejects.toMatchObject({ code: "RATE_LIMITED", status: 429 });

    const failingProvider: AiProvider = {
      generateJson: vi.fn().mockRejectedValue(new Error("upstream unavailable")),
    };

    await expect(
      executeAiAction("intervene", sensitiveMomentInput, {
        provider: failingProvider,
        signal: new AbortController().signal,
        logger,
      }),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR", status: 503 });
  });

  it("maps abort signals to TIMEOUT", async () => {
    const controller = new AbortController();
    controller.abort();

    const provider: AiProvider = {
      generateJson: vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")),
    };
    const { logger } = createTestLogger();
    const { executeAiAction } = await import("@/features/ai/service");

    await expect(
      executeAiAction("intervene", sensitiveMomentInput, {
        provider,
        signal: controller.signal,
        logger,
      }),
    ).rejects.toMatchObject({ code: "TIMEOUT", status: 504 });
  });

  it("logs allowlisted metadata only and never logs request content", async () => {
    const provider = createProvider(validIntervention);
    const { logger, entries } = createTestLogger();
    const { executeAiAction } = await import("@/features/ai/service");

    await executeAiAction("intervene", sensitiveMomentInput, {
      provider,
      signal: new AbortController().signal,
      logger,
    });

    const serialized = JSON.stringify(entries);
    expect(serialized).toContain('"action":"intervene"');
    expect(serialized).toContain('"status":200');
    expect(serialized).toMatch(/"durationMs":\d+/);
    expect(serialized).not.toContain("SECRET_RECOVERY_CONTEXT_AND_NICKNAME");
    expect(serialized).not.toContain("recovery coach");
    expect(serialized).not.toContain("sk-");
    expect(serialized).not.toContain("token");
  });

  it("logs error metadata without sensitive content on failure", async () => {
    const provider = createProvider({ steps: [] });
    const { logger, entries } = createTestLogger();
    const { executeAiAction } = await import("@/features/ai/service");

    await expect(
      executeAiAction("intervene", sensitiveMomentInput, {
        provider,
        signal: new AbortController().signal,
        logger,
      }),
    ).rejects.toBeInstanceOf(AppError);

    const serialized = JSON.stringify(entries);
    expect(serialized).toContain('"code":"INVALID_PROVIDER_RESPONSE"');
    expect(serialized).toContain('"status":503');
    expect(serialized).not.toContain("SECRET_RECOVERY_CONTEXT_AND_NICKNAME");
  });
});
