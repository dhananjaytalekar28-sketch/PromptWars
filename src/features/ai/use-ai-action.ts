"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AiAction, AiRequestByAction, AiResult } from "./contracts";
import { requestAi } from "./client";
import { AppError, isAppError } from "@/shared/errors/app-error";

export type AiActionState<T> =
  | { status: "idle"; data: T | null; error: null }
  | { status: "loading"; data: T | null; error: null }
  | { status: "success"; data: T; error: null }
  | { status: "error"; data: T | null; error: AppError };

interface UseAiActionOptions<A extends AiAction> {
  readonly action: A;
  readonly initialData: AiResult<A> | null;
  readonly onSuccess?: (data: AiResult<A>) => void;
}

interface UseAiActionResult<A extends AiAction> {
  readonly state: AiActionState<AiResult<A>>;
  readonly run: (input: AiRequestByAction[A]) => Promise<void>;
  readonly retry: () => Promise<void>;
  readonly cancel: () => void;
}

function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  return new AppError("PROVIDER_ERROR");
}

export function useAiAction<A extends AiAction>({
  action,
  initialData,
  onSuccess,
}: UseAiActionOptions<A>): UseAiActionResult<A> {
  const [state, setState] = useState<AiActionState<AiResult<A>>>({
    status: "idle",
    data: initialData,
    error: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastInputRef = useRef<AiRequestByAction[A] | null>(null);
  const requestIdRef = useRef(0);
  const onSuccessRef = useRef(onSuccess);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
  }, []);

  const execute = useCallback(
    async (input: AiRequestByAction[A]) => {
      if (abortControllerRef.current) {
        return;
      }

      lastInputRef.current = input;
      const requestId = requestIdRef.current + 1;
      requestIdRef.current = requestId;

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setState((current) => ({
        status: "loading",
        data: current.data,
        error: null,
      }));

      try {
        const data = await requestAi(action, input, { signal: controller.signal });

        if (requestId !== requestIdRef.current || controller.signal.aborted) {
          return;
        }

        setState({ status: "success", data, error: null });
        onSuccessRef.current?.(data);
      } catch (error) {
        if (requestId !== requestIdRef.current || controller.signal.aborted) {
          return;
        }

        setState((current) => ({
          status: "error",
          data: current.data,
          error: toAppError(error),
        }));
      } finally {
        if (abortControllerRef.current === controller) {
          abortControllerRef.current = null;
        }
      }
    },
    [action],
  );

  const run = useCallback(
    async (input: AiRequestByAction[A]) => {
      await execute(input);
    },
    [execute],
  );

  const retry = useCallback(async () => {
    if (!lastInputRef.current) {
      return;
    }

    await execute(lastInputRef.current);
  }, [execute]);

  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return { state, run, retry, cancel };
}
