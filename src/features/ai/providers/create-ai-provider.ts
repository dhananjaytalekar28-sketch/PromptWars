import "server-only";

import type { AiProvider } from "@/features/ai/contracts";
import type { ServerConfig } from "@/shared/config/server";
import { createFakeProvider, shouldUseFakeAi } from "@/features/ai/providers/fake-provider";
import { createGeminiProvider } from "@/features/ai/providers/gemini-provider";

export function createAiProvider(config: ServerConfig): AiProvider {
  if (shouldUseFakeAi()) {
    return createFakeProvider();
  }

  return createGeminiProvider(config);
}
