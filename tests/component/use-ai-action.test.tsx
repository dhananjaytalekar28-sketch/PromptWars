import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
};

vi.mock("@/features/ai/client", () => ({
  requestAi: vi.fn(),
}));

describe("useAiAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("transitions idle -> loading -> success", async () => {
    const { requestAi } = await import("@/features/ai/client");
    vi.mocked(requestAi).mockResolvedValue(validIntervention);

    const { useAiAction } = await import("@/features/ai/use-ai-action");
    const { result } = renderHook(() =>
      useAiAction({
        action: "intervene",
        initialData: null,
      }),
    );

    expect(result.current.state).toEqual({ status: "idle", data: null, error: null });

    let runPromise: Promise<void>;
    act(() => {
      runPromise = result.current.run(validMomentInput);
    });

    expect(result.current.state.status).toBe("loading");

    await act(async () => {
      await runPromise!;
    });

    await waitFor(() => {
      expect(result.current.state).toEqual({
        status: "success",
        data: validIntervention,
        error: null,
      });
    });
  });

  it("transitions loading -> error", async () => {
    const { requestAi } = await import("@/features/ai/client");
    vi.mocked(requestAi).mockRejectedValue(new AppError("PROVIDER_ERROR"));

    const { useAiAction } = await import("@/features/ai/use-ai-action");
    const { result } = renderHook(() =>
      useAiAction({
        action: "intervene",
        initialData: null,
      }),
    );

    await act(async () => {
      await result.current.run(validMomentInput);
    });

    expect(result.current.state).toEqual({
      status: "error",
      data: null,
      error: expect.objectContaining({ code: "PROVIDER_ERROR" }),
    });
  });

  it("suppresses duplicate invocations while loading", async () => {
    const { requestAi } = await import("@/features/ai/client");
    let resolveRequest: (value: typeof validIntervention) => void;
    vi.mocked(requestAi).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRequest = resolve;
        }),
    );

    const { useAiAction } = await import("@/features/ai/use-ai-action");
    const { result } = renderHook(() =>
      useAiAction({
        action: "intervene",
        initialData: null,
      }),
    );

    act(() => {
      void result.current.run(validMomentInput);
      void result.current.run(validMomentInput);
    });

    expect(requestAi).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRequest!(validIntervention);
    });
  });

  it("retains previous data on error", async () => {
    const { requestAi } = await import("@/features/ai/client");
    vi.mocked(requestAi)
      .mockResolvedValueOnce(validIntervention)
      .mockRejectedValueOnce(new AppError("PROVIDER_ERROR"));

    const { useAiAction } = await import("@/features/ai/use-ai-action");
    const { result } = renderHook(() =>
      useAiAction({
        action: "intervene",
        initialData: null,
      }),
    );

    await act(async () => {
      await result.current.run(validMomentInput);
    });

    await act(async () => {
      await result.current.run(validMomentInput);
    });

    expect(result.current.state).toEqual({
      status: "error",
      data: validIntervention,
      error: expect.objectContaining({ code: "PROVIDER_ERROR" }),
    });
  });

  it("supports explicit retry with the last input", async () => {
    const { requestAi } = await import("@/features/ai/client");
    vi.mocked(requestAi)
      .mockRejectedValueOnce(new AppError("PROVIDER_ERROR"))
      .mockResolvedValueOnce(validIntervention);

    const { useAiAction } = await import("@/features/ai/use-ai-action");
    const { result } = renderHook(() =>
      useAiAction({
        action: "intervene",
        initialData: null,
      }),
    );

    await act(async () => {
      await result.current.run(validMomentInput);
    });

    await act(async () => {
      await result.current.retry();
    });

    expect(requestAi).toHaveBeenCalledTimes(2);
    expect(result.current.state).toEqual({
      status: "success",
      data: validIntervention,
      error: null,
    });
  });

  it("calls onSuccess when a request succeeds", async () => {
    const { requestAi } = await import("@/features/ai/client");
    vi.mocked(requestAi).mockResolvedValue(validIntervention);
    const onSuccess = vi.fn();

    const { useAiAction } = await import("@/features/ai/use-ai-action");
    const { result } = renderHook(() =>
      useAiAction({
        action: "intervene",
        initialData: null,
        onSuccess,
      }),
    );

    await act(async () => {
      await result.current.run(validMomentInput);
    });

    expect(onSuccess).toHaveBeenCalledWith(validIntervention);
  });

  it("aborts in-flight requests on unmount without updating state", async () => {
    const { requestAi } = await import("@/features/ai/client");
    let capturedSignal: AbortSignal | undefined;
    let rejectRequest: (error: unknown) => void;

    vi.mocked(requestAi).mockImplementation((_action, _input, options) => {
      capturedSignal = options.signal;
      return new Promise((_resolve, reject) => {
        rejectRequest = reject;
      });
    });

    const { useAiAction } = await import("@/features/ai/use-ai-action");
    const { result, unmount } = renderHook(() =>
      useAiAction({
        action: "intervene",
        initialData: null,
      }),
    );

    act(() => {
      void result.current.run(validMomentInput);
    });

    unmount();

    expect(capturedSignal?.aborted).toBe(true);

    await act(async () => {
      rejectRequest!(new DOMException("Aborted", "AbortError"));
    });
  });
});
