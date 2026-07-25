import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError } from "@/shared/errors/app-error";
import type { MomentPayload } from "@/features/check-in/types";

const validIntervention = {
  steps: [
    { title: "Breathe", body: "Take five slow breaths." },
    { title: "Ground", body: "Name five things you can see." },
    { title: "Reach out", body: "Text your support person." },
  ],
};

const validMomentInput: MomentPayload = {
  riskLevel: 4,
  chips: ["craving", "alone"],
  voiceOrTextNote: "context",
};

describe("requestAi", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns parsed data for a successful response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: validIntervention }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const { requestAi } = await import("@/features/ai/client");
    const result = await requestAi("intervene", validMomentInput, {
      signal: new AbortController().signal,
    });

    expect(result).toEqual(validIntervention);
    expect(fetch).toHaveBeenCalledWith("/api/ai/intervene", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validMomentInput),
      signal: expect.any(AbortSignal),
    });
  });

  it("throws AppError for structured 4xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "INVALID_REQUEST", message: "The request was invalid." },
          }),
          { status: 400, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const { requestAi } = await import("@/features/ai/client");

    await expect(
      requestAi("intervene", validMomentInput, { signal: new AbortController().signal }),
    ).rejects.toMatchObject({
      code: "INVALID_REQUEST",
      status: 400,
      safeMessage: "The request was invalid.",
    });
  });

  it("maps unknown structured error codes to PROVIDER_ERROR", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "UNKNOWN_CODE", message: "Something else failed." },
          }),
          { status: 503, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const { requestAi } = await import("@/features/ai/client");

    await expect(
      requestAi("intervene", validMomentInput, { signal: new AbortController().signal }),
    ).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      safeMessage: "Something else failed.",
    });
  });

  it("throws AppError for malformed error envelopes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "bad" }), {
          status: 503,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const { requestAi } = await import("@/features/ai/client");

    await expect(
      requestAi("intervene", validMomentInput, { signal: new AbortController().signal }),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });

  it("throws AppError for structured 5xx responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: { code: "PROVIDER_ERROR", message: "AI is temporarily unavailable." },
          }),
          { status: 503, headers: { "content-type": "application/json" } },
        ),
      ),
    );

    const { requestAi } = await import("@/features/ai/client");

    await expect(
      requestAi("intervene", validMomentInput, { signal: new AbortController().signal }),
    ).rejects.toMatchObject({
      code: "PROVIDER_ERROR",
      status: 503,
    });
  });

  it("throws AppError when the success envelope is invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ data: { steps: [] } }), {
          status: 200,
          headers: { "content-type": "application/json" },
        }),
      ),
    );

    const { requestAi } = await import("@/features/ai/client");

    await expect(
      requestAi("intervene", validMomentInput, { signal: new AbortController().signal }),
    ).rejects.toBeInstanceOf(AppError);
  });

  it("throws AppError on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { requestAi } = await import("@/features/ai/client");

    await expect(
      requestAi("intervene", validMomentInput, { signal: new AbortController().signal }),
    ).rejects.toMatchObject({ code: "PROVIDER_ERROR" });
  });

  it("rejects with abort when the signal is aborted", async () => {
    const controller = new AbortController();
    controller.abort();

    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation((_url, init) => {
        const signal = init?.signal as AbortSignal;
        return new Promise((_resolve, reject) => {
          if (signal.aborted) {
            reject(new DOMException("Aborted", "AbortError"));
            return;
          }
          signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
        });
      }),
    );

    const { requestAi } = await import("@/features/ai/client");

    await expect(
      requestAi("intervene", validMomentInput, { signal: controller.signal }),
    ).rejects.toMatchObject({
      code: "TIMEOUT",
    });
  });
});
