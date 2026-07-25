import "server-only";

import type { AiAction, AiProvider } from "@/features/ai/contracts";
import {
  briefingResponseSchema,
  interventionResponseSchema,
  learnResponseSchema,
  scriptsResponseSchema,
} from "@/features/ai/schemas";

/** Non-secret marker used to verify this module never ships in client bundles. */
export const FAKE_PROVIDER_BUILD_MARKER = "recoverai-fake-provider-server-only";

const DETERMINISTIC_RESPONSES = {
  intervene: interventionResponseSchema.parse({
    steps: [
      { title: "E2E Breathe", body: "Take five slow breaths to calm your body." },
      { title: "E2E Ground", body: "Name five things you can see around you." },
      { title: "E2E Reach out", body: "Text or call someone you trust right now." },
    ],
  }),
  scripts: scriptsResponseSchema.parse({
    personScript:
      "E2E person script: Pause and breathe. You can get through this moment without acting on the urge.",
    caregiverScript:
      "E2E caregiver script: Stay calm, listen without judgment, and remind them this feeling will pass.",
  }),
  briefing: briefingResponseSchema.parse({
    briefing:
      "E2E briefing: Your loved one may be experiencing intense cravings and feeling alone.",
    doSay: ["I am here with you.", "This feeling will pass.", "You are not alone."],
    dontSay: ["Just stop thinking about it.", "Why did you do this?", "You are overreacting."],
  }),
  learn: learnResponseSchema.parse({
    blurb:
      "E2E learn blurb: Urge surfing helps because cravings peak and fade naturally within minutes.",
  }),
} as const;

export function isE2eFakeAiEnabled(): boolean {
  return process.env.E2E_FAKE_AI === "true";
}

export function assertE2eFakeAiAllowed(): void {
  if (isE2eFakeAiEnabled() && process.env.NODE_ENV === "production") {
    throw new Error("E2E_FAKE_AI cannot be enabled when NODE_ENV is production.");
  }
}

export function shouldUseFakeAi(): boolean {
  assertE2eFakeAiAllowed();
  return isE2eFakeAiEnabled() && process.env.NODE_ENV !== "production";
}

function resolveActionFromSchema(schema: Record<string, unknown>): AiAction {
  const properties =
    typeof schema.properties === "object" && schema.properties !== null
      ? (schema.properties as Record<string, unknown>)
      : {};

  if ("steps" in properties) {
    return "intervene";
  }

  if ("personScript" in properties && "caregiverScript" in properties) {
    return "scripts";
  }

  if ("briefing" in properties) {
    return "briefing";
  }

  if ("blurb" in properties) {
    return "learn";
  }

  throw new Error("Fake provider could not determine AI action from response schema.");
}

export function createFakeProvider(): AiProvider {
  assertE2eFakeAiAllowed();

  return {
    async generateJson({ responseJsonSchema, signal }) {
      if (signal.aborted) {
        throw signal.reason ?? new DOMException("Aborted", "AbortError");
      }

      if (process.env.E2E_SIMULATE_AI_ERROR === "true") {
        throw new Error("E2E simulated provider failure");
      }

      const action = resolveActionFromSchema(responseJsonSchema);
      return DETERMINISTIC_RESPONSES[action];
    },
  };
}
