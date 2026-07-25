import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiProvider } from "@/features/ai/contracts";
import type { RateLimiter } from "@/features/ai/rate-limit";
import type { LoggerMetadata } from "@/shared/logging/logger";

vi.mock("server-only", () => ({}));

const ORIGINAL_ENV = { ...process.env };

const validIntervention = {
  steps: [
    { title: "Breathe", body: "Take five slow breaths." },
    { title: "Ground", body: "Name five things you can see." },
    { title: "Reach out", body: "Text your support person." },
  ],
};

const validMomentInput = {
  riskLevel: 4,
  chips: ["craving", "alone"],
  voiceOrTextNote: "SECRET_RECOVERY_CONTEXT_AND_NICKNAME",
};

const RAW_CLIENT_IP = "203.0.113.42";

function restoreEnv(): void {
  process.env = { ...ORIGINAL_ENV };
}

function createJsonRequest(body: string | null, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/ai/intervene", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers,
    },
    body,
  });
}

function createAllowingLimiter(): RateLimiter {
  return {
    check: vi.fn().mockResolvedValue({ allowed: true, retryAfterSeconds: 0 }),
  };
}

function createDenyingLimiter(retryAfterSeconds = 30): RateLimiter {
  return {
    check: vi.fn().mockResolvedValue({ allowed: false, retryAfterSeconds }),
  };
}

function createProvider(response: unknown): AiProvider {
  return {
    generateJson: vi.fn().mockResolvedValue(response),
  };
}

function createTestLogger() {
  const entries: Array<{
    level: "info" | "warn" | "error";
    message: string;
    metadata?: LoggerMetadata;
  }> = [];
  const logger = {
    info: (message: string, metadata?: LoggerMetadata) =>
      entries.push({ level: "info", message, metadata }),
    warn: (message: string, metadata?: LoggerMetadata) =>
      entries.push({ level: "warn", message, metadata }),
    error: (message: string, metadata?: LoggerMetadata) =>
      entries.push({ level: "error", message, metadata }),
  };
  return { logger, entries };
}

async function parseJsonResponse(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("createAiRouteHandler", () => {
  beforeEach(() => {
    restoreEnv();
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
    process.env.GEMINI_API_KEY = "test-key";
  });

  afterEach(() => {
    restoreEnv();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns 200 with parsed data for a valid request", async () => {
    const provider = createProvider(validIntervention);
    const rateLimiter = createAllowingLimiter();
    const { logger } = createTestLogger();
    const { createAiRouteHandler } = await import("@/features/ai/route-handler");

    const handler = createAiRouteHandler("intervene", { provider, rateLimiter, logger });
    const response = await handler(createJsonRequest(JSON.stringify(validMomentInput)));

    expect(response.status).toBe(200);
    const body = await parseJsonResponse(response);
    expect(body).toEqual({ data: validIntervention });
    expect(provider.generateJson).toHaveBeenCalledOnce();
  });

  it("returns 400 for malformed JSON", async () => {
    const provider = createProvider(validIntervention);
    const rateLimiter = createAllowingLimiter();
    const { createAiRouteHandler } = await import("@/features/ai/route-handler");

    const handler = createAiRouteHandler("intervene", { provider, rateLimiter });
    const response = await handler(createJsonRequest("{not-json"));

    expect(response.status).toBe(400);
    const body = await parseJsonResponse(response);
    expect(body).toEqual({
      error: { code: "INVALID_REQUEST", message: "The request was invalid." },
    });
    expect(provider.generateJson).not.toHaveBeenCalled();
  });

  it("returns 413 when Content-Length exceeds 4 KB", async () => {
    const provider = createProvider(validIntervention);
    const rateLimiter = createAllowingLimiter();
    const { createAiRouteHandler } = await import("@/features/ai/route-handler");

    const handler = createAiRouteHandler("intervene", { provider, rateLimiter });
    const response = await handler(
      createJsonRequest(JSON.stringify(validMomentInput), { "content-length": "5000" }),
    );

    expect(response.status).toBe(413);
    const body = await parseJsonResponse(response);
    expect(body.error).toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
    expect(provider.generateJson).not.toHaveBeenCalled();
  });

  it("returns 413 when the encoded body exceeds 4 KB", async () => {
    const provider = createProvider(validIntervention);
    const rateLimiter = createAllowingLimiter();
    const { createAiRouteHandler } = await import("@/features/ai/route-handler");

    const oversizedBody = JSON.stringify({
      ...validMomentInput,
      voiceOrTextNote: "x".repeat(5_000),
    });

    const handler = createAiRouteHandler("intervene", { provider, rateLimiter });
    const response = await handler(createJsonRequest(oversizedBody));

    expect(response.status).toBe(413);
    expect(provider.generateJson).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid request schema", async () => {
    const provider = createProvider(validIntervention);
    const rateLimiter = createAllowingLimiter();
    const { createAiRouteHandler } = await import("@/features/ai/route-handler");

    const handler = createAiRouteHandler("intervene", { provider, rateLimiter });
    const response = await handler(createJsonRequest(JSON.stringify({ riskLevel: 9, chips: [] })));

    expect(response.status).toBe(400);
    const body = await parseJsonResponse(response);
    expect(body).toEqual({
      error: { code: "INVALID_REQUEST", message: "The request was invalid." },
    });
    expect(provider.generateJson).not.toHaveBeenCalled();
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    const provider = createProvider(validIntervention);
    const rateLimiter = createDenyingLimiter(45);
    const { createAiRouteHandler } = await import("@/features/ai/route-handler");

    const handler = createAiRouteHandler("intervene", {
      provider,
      rateLimiter,
    });
    const response = await handler(
      createJsonRequest(JSON.stringify(validMomentInput), {
        "x-forwarded-for": RAW_CLIENT_IP,
      }),
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("45");
    const body = await parseJsonResponse(response);
    expect(body).toEqual({
      error: { code: "RATE_LIMITED", message: "Too many requests. Please try again later." },
    });
    expect(provider.generateJson).not.toHaveBeenCalled();
    expect(rateLimiter.check).toHaveBeenCalledOnce();

    const identifier = vi.mocked(rateLimiter.check).mock.calls[0]?.[0];
    expect(identifier).toBeTruthy();
    expect(identifier).not.toContain(RAW_CLIENT_IP);
  });

  it("returns 503 for malformed AI output", async () => {
    const provider = createProvider({ steps: [] });
    const rateLimiter = createAllowingLimiter();
    const { createAiRouteHandler } = await import("@/features/ai/route-handler");

    const handler = createAiRouteHandler("intervene", { provider, rateLimiter });
    const response = await handler(createJsonRequest(JSON.stringify(validMomentInput)));

    expect(response.status).toBe(503);
    const body = await parseJsonResponse(response);
    expect(body).toEqual({
      error: {
        code: "INVALID_PROVIDER_RESPONSE",
        message: "AI returned an unexpected response.",
      },
    });
  });

  it("returns 504 when the provider times out", async () => {
    const provider: AiProvider = {
      generateJson: vi.fn().mockImplementation((_input) => {
        return new Promise((_resolve, reject) => {
          _input.signal.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        });
      }),
    };
    const rateLimiter = createAllowingLimiter();
    const { createAiRouteHandler } = await import("@/features/ai/route-handler");

    const handler = createAiRouteHandler("intervene", {
      provider,
      rateLimiter,
      getServerConfig: () => ({
        geminiApiKey: "test-key",
        geminiModel: "gemini-2.5-flash",
        aiTimeoutMs: 50,
      }),
    });

    const response = await handler(createJsonRequest(JSON.stringify(validMomentInput)));

    expect(response.status).toBe(504);
    const body = await parseJsonResponse(response);
    expect(body).toEqual({
      error: { code: "TIMEOUT", message: "The request timed out. Please try again." },
    });
  });

  it("returns generic 503 without stack or provider details on provider failure", async () => {
    const provider: AiProvider = {
      generateJson: vi
        .fn()
        .mockRejectedValue(new Error("Gemini internal stack trace at secret.ts:42")),
    };
    const rateLimiter = createAllowingLimiter();
    const { createAiRouteHandler } = await import("@/features/ai/route-handler");

    const handler = createAiRouteHandler("intervene", { provider, rateLimiter });
    const response = await handler(createJsonRequest(JSON.stringify(validMomentInput)));

    expect(response.status).toBe(503);
    const bodyText = JSON.stringify(await parseJsonResponse(response));
    expect(bodyText).not.toMatch(/stack|secret\.ts|Gemini/i);
    expect(bodyText).toContain("PROVIDER_ERROR");
  });

  it("rejects non-JSON content types with 400", async () => {
    const provider = createProvider(validIntervention);
    const rateLimiter = createAllowingLimiter();
    const { createAiRouteHandler } = await import("@/features/ai/route-handler");

    const handler = createAiRouteHandler("intervene", { provider, rateLimiter });
    const response = await handler(
      new Request("http://localhost/api/ai/intervene", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: JSON.stringify(validMomentInput),
      }),
    );

    expect(response.status).toBe(400);
    expect(provider.generateJson).not.toHaveBeenCalled();
  });

  it("wires requestId from x-request-id into logging metadata", async () => {
    const provider = createProvider(validIntervention);
    const rateLimiter = createAllowingLimiter();
    const { logger, entries } = createTestLogger();
    const { createAiRouteHandler } = await import("@/features/ai/route-handler");

    const handler = createAiRouteHandler("intervene", { provider, rateLimiter, logger });
    await handler(
      createJsonRequest(JSON.stringify(validMomentInput), { "x-request-id": "req-abc-123" }),
    );

    const completed = entries.find((entry) => entry.message === "ai.action.completed");
    expect(completed?.metadata?.requestId).toBe("req-abc-123");
  });

  it("never logs raw IP, prompts, nicknames, or recovery context", async () => {
    const provider = createProvider(validIntervention);
    const rateLimiter = createAllowingLimiter();
    const { logger, entries } = createTestLogger();
    const { createAiRouteHandler } = await import("@/features/ai/route-handler");

    const handler = createAiRouteHandler("intervene", { provider, rateLimiter, logger });
    await handler(
      createJsonRequest(JSON.stringify(validMomentInput), {
        "x-forwarded-for": RAW_CLIENT_IP,
        "x-request-id": "req-sensitive",
      }),
    );

    const serialized = JSON.stringify(entries);
    expect(serialized).not.toContain(RAW_CLIENT_IP);
    expect(serialized).not.toContain("SECRET_RECOVERY_CONTEXT_AND_NICKNAME");
    expect(serialized).not.toContain("Breathe");
  });
});

describe("createRateLimiter", () => {
  beforeEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  afterEach(() => {
    restoreEnv();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("fails closed in production when Upstash credentials are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { createRateLimiter } = await import("@/features/ai/rate-limit");

    expect(() => createRateLimiter()).toThrow(/UPSTASH/i);
  });

  it("uses an in-memory limiter in non-production when Upstash credentials are missing", async () => {
    vi.stubEnv("NODE_ENV", "development");
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;

    const { createRateLimiter } = await import("@/features/ai/rate-limit");
    const limiter = createRateLimiter();

    const first = await limiter.check("client-a");
    expect(first.allowed).toBe(true);

    for (let index = 0; index < 20; index += 1) {
      await limiter.check("client-a");
    }

    const blocked = await limiter.check("client-a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});

describe("AI route module exports", () => {
  it("exposes POST handlers for each AI action route", async () => {
    const [{ POST: briefing }, { POST: intervene }, { POST: learn }, { POST: scripts }] =
      await Promise.all([
        import("@/app/api/ai/briefing/route"),
        import("@/app/api/ai/intervene/route"),
        import("@/app/api/ai/learn/route"),
        import("@/app/api/ai/scripts/route"),
      ]);

    expect(typeof briefing).toBe("function");
    expect(typeof intervene).toBe("function");
    expect(typeof learn).toBe("function");
    expect(typeof scripts).toBe("function");
  });
});
