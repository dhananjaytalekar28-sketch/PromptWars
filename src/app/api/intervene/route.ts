import { NextResponse } from "next/server";
import { momentPayloadSchema } from "@/lib/schemas";
import { generateJSON } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are a supportive, non-judgmental recovery coach. You help people navigate cravings and urges with short, actionable steps. Never provide medical or dosing advice. Encourage professional help when appropriate. Keep language calm, empathetic, and brief.

Respond with a JSON object: { "steps": [{ "title": "short action title", "body": "1-2 sentence guidance" }] }
Provide 3-5 steps. Each step should be something the person can do right now with zero preparation.`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = momentPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { riskLevel, chips, voiceOrTextNote } = parsed.data;

    const userPrompt = `I'm at urge intensity ${riskLevel}/5. What I'm experiencing: ${chips.join(", ")}.${
      voiceOrTextNote ? ` Additional context: ${voiceOrTextNote}` : ""
    } Give me steps to get through this moment.`;

    const result = await generateJSON(SYSTEM_PROMPT, userPrompt);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("GEMINI_API_KEY")) {
      return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to generate intervention" }, { status: 500 });
  }
}
