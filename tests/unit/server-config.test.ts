import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const ORIGINAL_ENV = { ...process.env };

function restoreEnv(): void {
  process.env = { ...ORIGINAL_ENV };
}

describe("getServerConfig", () => {
  beforeEach(() => {
    restoreEnv();
    vi.resetModules();
  });

  afterEach(() => {
    restoreEnv();
  });

  it("throws when GEMINI_API_KEY is missing", async () => {
    delete process.env.GEMINI_API_KEY;

    const { getServerConfig } = await import("@/shared/config/server");

    expect(() => getServerConfig()).toThrow(/GEMINI_API_KEY/i);
  });

  it("uses the default Gemini model when GEMINI_MODEL is unset", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.GEMINI_MODEL;

    const { getServerConfig } = await import("@/shared/config/server");

    expect(getServerConfig().geminiModel).toBe("gemini-2.5-flash");
  });

  it("honors a GEMINI_MODEL override", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.GEMINI_MODEL = "gemini-2.5-pro";

    const { getServerConfig } = await import("@/shared/config/server");

    expect(getServerConfig().geminiModel).toBe("gemini-2.5-pro");
  });

  it("uses the default AI timeout when AI_TIMEOUT_MS is unset", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    delete process.env.AI_TIMEOUT_MS;

    const { getServerConfig } = await import("@/shared/config/server");

    expect(getServerConfig().aiTimeoutMs).toBe(15_000);
  });

  it("honors a valid AI_TIMEOUT_MS override", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.AI_TIMEOUT_MS = "30000";

    const { getServerConfig } = await import("@/shared/config/server");

    expect(getServerConfig().aiTimeoutMs).toBe(30_000);
  });

  it("rejects AI_TIMEOUT_MS below the minimum bound", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.AI_TIMEOUT_MS = "500";

    const { getServerConfig } = await import("@/shared/config/server");

    expect(() => getServerConfig()).toThrow();
  });

  it("rejects AI_TIMEOUT_MS above the maximum bound", async () => {
    process.env.GEMINI_API_KEY = "test-key";
    process.env.AI_TIMEOUT_MS = "300000";

    const { getServerConfig } = await import("@/shared/config/server");

    expect(() => getServerConfig()).toThrow();
  });

  it("returns the API key without exposing it through NEXT_PUBLIC_*", async () => {
    process.env.GEMINI_API_KEY = "server-only-secret";
    delete process.env.NEXT_PUBLIC_GEMINI_API_KEY;

    const { getServerConfig } = await import("@/shared/config/server");
    const config = getServerConfig();

    expect(config.geminiApiKey).toBe("server-only-secret");
    expect(process.env.NEXT_PUBLIC_GEMINI_API_KEY).toBeUndefined();
  });
});
