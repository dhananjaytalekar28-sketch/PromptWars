import { NextResponse } from "next/server";
import { momentPayloadSchema } from "@/lib/schemas";
import { generateJSON } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are a supportive coach helping caregivers understand what their loved one is going through and how to respond. Be empathetic, non-judgmental, and concise. Never blame the person in recovery. No medical advice.

Respond with JSON: { "briefing": "1-2 paragraph summary of what the person may be experiencing", "doSay": ["phrase 1", "phrase 2", "phrase 3"], "dontSay": ["phrase 1", "phrase 2", "phrase 3"] }
Provide 3-5 items in each list.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = momentPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { riskLevel, chips, voiceOrTextNote } = parsed.data;

    const userPrompt = `My loved one just checked in at urge intensity ${riskLevel}/5. They reported: ${chips.join(", ")}.${
      voiceOrTextNote ? ` They also said: ${voiceOrTextNote}` : ""
    } Help me understand what they're going through and what I should/shouldn't say.`;

    const result = await generateJSON(SYSTEM_PROMPT, userPrompt);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("GEMINI_API_KEY")) {
      return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to generate briefing" }, { status: 500 });
  }
}
