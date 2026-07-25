import "server-only";

import { GoogleGenAI } from "@google/genai";
import type { AiProvider } from "@/features/ai/contracts";
import type { ServerConfig } from "@/shared/config/server";

/** Non-secret marker used to verify this module never ships in client bundles. */
export const GEMINI_PROVIDER_BUILD_MARKER = "recoverai-gemini-provider-server-only";

export type GeminiProviderConfig = Pick<
  ServerConfig,
  "geminiApiKey" | "geminiModel" | "aiTimeoutMs"
>;

function raceWithAbortSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
  }

  return new Promise<T>((resolve, reject) => {
    const onAbort = (): void => {
      reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    };

    signal.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (value) => {
        signal.removeEventListener("abort", onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener("abort", onAbort);
        reject(error);
      },
    );
  });
}

export function createGeminiProvider(config: GeminiProviderConfig): AiProvider {
  const ai = new GoogleGenAI({ apiKey: config.geminiApiKey });

  return {
    async generateJson({ systemPrompt, userPrompt, responseJsonSchema, signal }) {
      const request = ai.models.generateContent({
        model: config.geminiModel,
        contents: userPrompt,
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json",
          responseJsonSchema,
          abortSignal: signal,
        },
      });

      const response = await raceWithAbortSignal(request, signal);
      const text = response.text;

      if (!text) {
        throw new Error("Gemini returned an empty response");
      }

      return JSON.parse(text) as unknown;
    },
  };
}
