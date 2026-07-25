import { NextResponse } from "next/server";
import { momentPayloadSchema } from "@/lib/schemas";
import { generateJSON } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are a supportive recovery coach generating emergency scripts for a crisis moment. Create TWO scripts:
1. A "person script" — step-by-step self-talk and actions for the person experiencing the crisis
2. A "caregiver script" — what a supporting person should say and do in that moment

Be empathetic, non-judgmental, concise. No medical/dosing advice. Encourage professional help.

Respond with JSON: { "personScript": "the person's script text (2-4 paragraphs)", "caregiverScript": "the caregiver's script text (2-4 paragraphs)" }`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = momentPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { riskLevel, chips, voiceOrTextNote } = parsed.data;

    const userPrompt = `Generate dual emergency scripts for this moment: urge intensity ${riskLevel}/5, experiencing: ${chips.join(", ")}.${
      voiceOrTextNote ? ` Context: ${voiceOrTextNote}` : ""
    }`;

    const result = await generateJSON(SYSTEM_PROMPT, userPrompt);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("GEMINI_API_KEY")) {
      return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to generate scripts" }, { status: 500 });
  }
}
