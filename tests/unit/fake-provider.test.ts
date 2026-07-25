import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import {
  briefingResponseSchema,
  interventionResponseSchema,
  learnResponseSchema,
  scriptsResponseSchema,
} from "@/features/ai/schemas";

vi.mock("server-only", () => ({}));

const ORIGINAL_ENV = { ...process.env };

function restoreEnv(): void {
  process.env = { ...ORIGINAL_ENV };
}

describe("fake AI provider", () => {
  beforeEach(() => {
    restoreEnv();
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "test");
  });

  afterEach(() => {
    restoreEnv();
    vi.unstubAllEnvs();
  });

  it("throws when E2E_FAKE_AI is enabled in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    process.env.E2E_FAKE_AI = "true";

    const { assertE2eFakeAiAllowed } = await import("@/features/ai/providers/fake-provider");

    expect(() => assertE2eFakeAiAllowed()).toThrow(/E2E_FAKE_AI cannot be enabled/i);
  });

  it("returns deterministic intervene responses that pass schema validation", async () => {
    process.env.E2E_FAKE_AI = "true";

    const { createFakeProvider } = await import("@/features/ai/providers/fake-provider");
    const provider = createFakeProvider();

    const raw = await provider.generateJson({
      systemPrompt: "system",
      userPrompt: "user",
      responseJsonSchema: z.toJSONSchema(interventionResponseSchema) as Record<string, unknown>,
      signal: new AbortController().signal,
    });

    expect(interventionResponseSchema.parse(raw).steps[0]?.title).toBe("E2E Breathe");
  });

  it("returns deterministic scripts, briefing, and learn responses", async () => {
    process.env.E2E_FAKE_AI = "true";

    const { createFakeProvider } = await import("@/features/ai/providers/fake-provider");
    const provider = createFakeProvider();

    const scripts = await provider.generateJson({
      systemPrompt: "system",
      userPrompt: "user",
      responseJsonSchema: z.toJSONSchema(scriptsResponseSchema) as Record<string, unknown>,
      signal: new AbortController().signal,
    });
    expect(scriptsResponseSchema.parse(scripts).personScript).toContain("E2E person script");

    const briefing = await provider.generateJson({
      systemPrompt: "system",
      userPrompt: "user",
      responseJsonSchema: z.toJSONSchema(briefingResponseSchema) as Record<string, unknown>,
      signal: new AbortController().signal,
    });
    expect(briefingResponseSchema.parse(briefing).briefing).toContain("E2E briefing");

    const learn = await provider.generateJson({
      systemPrompt: "system",
      userPrompt: "user",
      responseJsonSchema: z.toJSONSchema(learnResponseSchema) as Record<string, unknown>,
      signal: new AbortController().signal,
    });
    expect(learnResponseSchema.parse(learn).blurb).toContain("E2E learn blurb");
  });

  it("selects the fake provider through the composition root when E2E_FAKE_AI is enabled", async () => {
    process.env.E2E_FAKE_AI = "true";

    const { createAiProvider } = await import("@/features/ai/providers/create-ai-provider");
    const provider = createAiProvider({
      geminiApiKey: "unused",
      geminiModel: "gemini-test",
      aiTimeoutMs: 1_000,
    });

    const raw = await provider.generateJson({
      systemPrompt: "system",
      userPrompt: "user",
      responseJsonSchema: z.toJSONSchema(interventionResponseSchema) as Record<string, unknown>,
      signal: new AbortController().signal,
    });

    expect(interventionResponseSchema.parse(raw).steps).toHaveLength(3);
  });

  it("simulates provider failures when E2E_SIMULATE_AI_ERROR is enabled", async () => {
    process.env.E2E_FAKE_AI = "true";
    process.env.E2E_SIMULATE_AI_ERROR = "true";

    const { createFakeProvider } = await import("@/features/ai/providers/fake-provider");
    const provider = createFakeProvider();

    await expect(
      provider.generateJson({
        systemPrompt: "system",
        userPrompt: "user",
        responseJsonSchema: z.toJSONSchema(interventionResponseSchema) as Record<string, unknown>,
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow(/E2E simulated provider failure/i);
  });
});
