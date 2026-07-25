import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const generateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(function GoogleGenAI() {
    return {
      models: {
        generateContent,
      },
    };
  }),
}));

describe("createGeminiProvider", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("parses JSON text from Gemini responses", async () => {
    generateContent.mockResolvedValue({ text: '{"briefing":"Calm support"}' });

    const { createGeminiProvider } = await import("@/features/ai/providers/gemini-provider");
    const provider = createGeminiProvider({
      geminiApiKey: "test-key",
      geminiModel: "gemini-test",
      aiTimeoutMs: 1_000,
    });

    const result = await provider.generateJson({
      systemPrompt: "system",
      userPrompt: "user",
      responseJsonSchema: { type: "object" },
      signal: new AbortController().signal,
    });

    expect(result).toEqual({ briefing: "Calm support" });
  });

  it("rejects empty Gemini responses", async () => {
    generateContent.mockResolvedValue({ text: "" });

    const { createGeminiProvider } = await import("@/features/ai/providers/gemini-provider");
    const provider = createGeminiProvider({
      geminiApiKey: "test-key",
      geminiModel: "gemini-test",
      aiTimeoutMs: 1_000,
    });

    await expect(
      provider.generateJson({
        systemPrompt: "system",
        userPrompt: "user",
        responseJsonSchema: { type: "object" },
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow("Gemini returned an empty response");
  });

  it("rejects when the abort signal is already aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    const { createGeminiProvider } = await import("@/features/ai/providers/gemini-provider");
    const provider = createGeminiProvider({
      geminiApiKey: "test-key",
      geminiModel: "gemini-test",
      aiTimeoutMs: 1_000,
    });

    await expect(
      provider.generateJson({
        systemPrompt: "system",
        userPrompt: "user",
        responseJsonSchema: { type: "object" },
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
  });
});
