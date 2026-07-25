import { learnPayloadSchema, momentPayloadSchema } from "@/features/check-in/schemas";
import type { LearnPayload, MomentPayload } from "@/features/check-in/types";
import type { AiActionDefinition } from "./contracts";
import {
  briefingResponseSchema,
  interventionResponseSchema,
  learnResponseSchema,
  scriptsResponseSchema,
  type BriefingResponse,
  type InterventionResponse,
  type LearnResponse,
  type ScriptsResponse,
} from "./schemas";

const INTERVENE_SYSTEM = `You are a supportive, non-judgmental recovery coach. You help people navigate cravings and urges with short, actionable steps. Never provide medical or dosing advice. Encourage professional help when appropriate. Keep language calm, empathetic, and brief.

Respond with a JSON object: { "steps": [{ "title": "short action title", "body": "1-2 sentence guidance" }] }
Provide 3-5 steps. Each step should be something the person can do right now with zero preparation.`;

const SCRIPTS_SYSTEM = `You are a supportive recovery coach generating emergency scripts for a crisis moment. Create TWO scripts:
1. A "person script" — step-by-step self-talk and actions for the person experiencing the crisis
2. A "caregiver script" — what a supporting person should say and do in that moment

Be empathetic, non-judgmental, concise. No medical/dosing advice. Encourage professional help.

Respond with JSON: { "personScript": "the person's script text (2-4 paragraphs)", "caregiverScript": "the caregiver's script text (2-4 paragraphs)" }`;

const BRIEFING_SYSTEM = `You are a supportive coach helping caregivers understand what their loved one is going through and how to respond. Be empathetic, non-judgmental, and concise. Never blame the person in recovery. No medical advice.

Respond with JSON: { "briefing": "1-2 paragraph summary of what the person may be experiencing", "doSay": ["phrase 1", "phrase 2", "phrase 3"], "dontSay": ["phrase 1", "phrase 2", "phrase 3"] }
Provide 3-5 items in each list.`;

const LEARN_SYSTEM = `You are an educational coach explaining recovery science in simple terms. Help the person understand why a specific technique or concept is relevant to THEIR situation. Be encouraging, honest, and concise. No medical advice.

Respond with JSON: { "blurb": "2-3 sentences explaining why this educational content is personally relevant to them right now" }`;

function buildInterveneUserPrompt({ riskLevel, chips, voiceOrTextNote }: MomentPayload): string {
  return `I'm at urge intensity ${riskLevel}/5. What I'm experiencing: ${chips.join(", ")}.${
    voiceOrTextNote ? ` Additional context: ${voiceOrTextNote}` : ""
  } Give me steps to get through this moment.`;
}

function buildScriptsUserPrompt({ riskLevel, chips, voiceOrTextNote }: MomentPayload): string {
  return `Generate dual emergency scripts for this moment: urge intensity ${riskLevel}/5, experiencing: ${chips.join(", ")}.${
    voiceOrTextNote ? ` Context: ${voiceOrTextNote}` : ""
  }`;
}

function buildBriefingUserPrompt({ riskLevel, chips, voiceOrTextNote }: MomentPayload): string {
  return `My loved one just checked in at urge intensity ${riskLevel}/5. They reported: ${chips.join(", ")}.${
    voiceOrTextNote ? ` They also said: ${voiceOrTextNote}` : ""
  } Help me understand what they're going through and what I should/shouldn't say.`;
}

function buildLearnUserPrompt({ riskLevel, chips, cardId }: LearnPayload): string {
  return `The person is at urge intensity ${riskLevel}/5, experiencing: ${chips.join(", ")}. They're reading about "${cardId}". Explain why this concept matters for them right now.`;
}

export const AI_ACTIONS: {
  intervene: AiActionDefinition<MomentPayload, InterventionResponse>;
  scripts: AiActionDefinition<MomentPayload, ScriptsResponse>;
  briefing: AiActionDefinition<MomentPayload, BriefingResponse>;
  learn: AiActionDefinition<LearnPayload, LearnResponse>;
} = {
  intervene: {
    requestSchema: momentPayloadSchema,
    responseSchema: interventionResponseSchema,
    systemPrompt: INTERVENE_SYSTEM,
    buildUserPrompt: buildInterveneUserPrompt,
  },
  scripts: {
    requestSchema: momentPayloadSchema,
    responseSchema: scriptsResponseSchema,
    systemPrompt: SCRIPTS_SYSTEM,
    buildUserPrompt: buildScriptsUserPrompt,
  },
  briefing: {
    requestSchema: momentPayloadSchema,
    responseSchema: briefingResponseSchema,
    systemPrompt: BRIEFING_SYSTEM,
    buildUserPrompt: buildBriefingUserPrompt,
  },
  learn: {
    requestSchema: learnPayloadSchema,
    responseSchema: learnResponseSchema,
    systemPrompt: LEARN_SYSTEM,
    buildUserPrompt: buildLearnUserPrompt,
  },
};
