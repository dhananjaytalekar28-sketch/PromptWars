import { generateJSONClient } from "./gemini-client";
import { ALLOWED_CHIPS } from "./types";

interface MomentInput {
  riskLevel: number;
  chips: string[];
  voiceOrTextNote?: string;
}

function validateMoment(input: MomentInput): boolean {
  if (input.riskLevel < 1 || input.riskLevel > 5) return false;
  if (!input.chips.length || input.chips.length > 9) return false;
  if (input.chips.some((c) => !(ALLOWED_CHIPS as readonly string[]).includes(c))) return false;
  if (input.voiceOrTextNote && input.voiceOrTextNote.length > 500) return false;
  return true;
}

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

export async function callIntervene(input: MomentInput): Promise<{ steps: { title: string; body: string }[] }> {
  if (!validateMoment(input)) throw new Error("Invalid input");
  const { riskLevel, chips, voiceOrTextNote } = input;
  const userPrompt = `I'm at urge intensity ${riskLevel}/5. What I'm experiencing: ${chips.join(", ")}.${
    voiceOrTextNote ? ` Additional context: ${voiceOrTextNote}` : ""
  } Give me steps to get through this moment.`;
  const result = await generateJSONClient(INTERVENE_SYSTEM, userPrompt);
  return result as { steps: { title: string; body: string }[] };
}

export async function callScripts(input: MomentInput): Promise<{ personScript: string; caregiverScript: string }> {
  if (!validateMoment(input)) throw new Error("Invalid input");
  const { riskLevel, chips, voiceOrTextNote } = input;
  const userPrompt = `Generate dual emergency scripts for this moment: urge intensity ${riskLevel}/5, experiencing: ${chips.join(", ")}.${
    voiceOrTextNote ? ` Context: ${voiceOrTextNote}` : ""
  }`;
  const result = await generateJSONClient(SCRIPTS_SYSTEM, userPrompt);
  return result as { personScript: string; caregiverScript: string };
}

export async function callBriefing(input: MomentInput): Promise<{ briefing: string; doSay: string[]; dontSay: string[] }> {
  if (!validateMoment(input)) throw new Error("Invalid input");
  const { riskLevel, chips, voiceOrTextNote } = input;
  const userPrompt = `My loved one just checked in at urge intensity ${riskLevel}/5. They reported: ${chips.join(", ")}.${
    voiceOrTextNote ? ` They also said: ${voiceOrTextNote}` : ""
  } Help me understand what they're going through and what I should/shouldn't say.`;
  const result = await generateJSONClient(BRIEFING_SYSTEM, userPrompt);
  return result as { briefing: string; doSay: string[]; dontSay: string[] };
}

export async function callLearn(input: { riskLevel: number; chips: string[]; cardId: string }): Promise<{ blurb: string }> {
  if (input.riskLevel < 1 || input.riskLevel > 5) throw new Error("Invalid input");
  const { riskLevel, chips, cardId } = input;
  const userPrompt = `The person is at urge intensity ${riskLevel}/5, experiencing: ${chips.join(", ")}. They're reading about "${cardId}". Explain why this concept matters for them right now.`;
  const result = await generateJSONClient(LEARN_SYSTEM, userPrompt);
  return result as { blurb: string };
}
