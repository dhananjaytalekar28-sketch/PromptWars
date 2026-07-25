import { afterEach, describe, expect, it, vi } from "vitest";

describe("createClientLogger", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("returns a console logger outside production", async () => {
    vi.stubEnv("NODE_ENV", "development");

    const { createClientLogger } = await import("@/shared/logging/client-logger");
    const logger = createClientLogger();

    expect(typeof logger.info).toBe("function");
    expect(typeof logger.warn).toBe("function");
    expect(typeof logger.error).toBe("function");
  });

  it("returns a silent logger in production", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const { createClientLogger } = await import("@/shared/logging/client-logger");
    const logger = createClientLogger();

    expect(logger.info("ignored")).toBeUndefined();
    expect(logger.warn("ignored")).toBeUndefined();
    expect(logger.error("ignored")).toBeUndefined();
  });
});
