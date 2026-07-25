import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";

let genAI: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!apiKey) throw new Error("AI service unavailable — API key not configured");
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

export async function generateJSONClient(systemPrompt: string, userPrompt: string): Promise<unknown> {
  const client = getClient();
  const model = client.getGenerativeModel({
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
