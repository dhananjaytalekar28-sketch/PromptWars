import { NextResponse } from "next/server";
import { learnPayloadSchema } from "@/lib/schemas";
import { generateJSON } from "@/lib/gemini";

const SYSTEM_PROMPT = `You are an educational coach explaining recovery science in simple terms. Help the person understand why a specific technique or concept is relevant to THEIR situation. Be encouraging, honest, and concise. No medical advice.

Respond with JSON: { "blurb": "2-3 sentences explaining why this educational content is personally relevant to them right now" }`;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = learnPayloadSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    const { riskLevel, chips, cardId } = parsed.data;

    const userPrompt = `The person is at urge intensity ${riskLevel}/5, experiencing: ${chips.join(", ")}. They're reading about "${cardId}". Explain why this concept matters for them right now.`;

    const result = await generateJSON(SYSTEM_PROMPT, userPrompt);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    if (message.includes("GEMINI_API_KEY")) {
      return NextResponse.json({ error: "AI service unavailable" }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to personalize content" }, { status: 500 });
  }
}
