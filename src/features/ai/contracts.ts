import type { z } from "zod";
import type { LearnPayload, MomentPayload } from "@/features/check-in/types";
import type {
  BriefingResponse,
  InterventionResponse,
  LearnResponse,
  ScriptsResponse,
} from "./schemas";

export type AiAction = "intervene" | "scripts" | "briefing" | "learn";

export interface AiProvider {
  generateJson(input: {
    systemPrompt: string;
    userPrompt: string;
    responseJsonSchema: Record<string, unknown>;
    signal: AbortSignal;
  }): Promise<unknown>;
}

export interface AiActionDefinition<Request, Response> {
  requestSchema: z.ZodType<Request>;
  responseSchema: z.ZodType<Response>;
  systemPrompt: string;
  buildUserPrompt(request: Request): string;
}

export interface AiRequestByAction {
  intervene: MomentPayload;
  scripts: MomentPayload;
  briefing: MomentPayload;
  learn: LearnPayload;
}

export interface AiResponseByAction {
  intervene: InterventionResponse;
  scripts: ScriptsResponse;
  briefing: BriefingResponse;
  learn: LearnResponse;
}

export type AiResult<A extends AiAction> = AiResponseByAction[A];
