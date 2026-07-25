import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error("GEMINI_API_KEY is not configured");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export async function generateJSON(systemPrompt: string, userPrompt: string): Promise<unknown> {
  if (!genAI) {
    throw new Error("AI service unavailable — GEMINI_API_KEY not configured");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    systemInstruction: { role: "model", parts: [{ text: systemPrompt }] },
  });

  const text = result.response.text();
  return JSON.parse(text);
}
