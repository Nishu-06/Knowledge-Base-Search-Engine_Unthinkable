import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function synthesizeAnswer(query, contexts) {
  try {
    // ✅ use latest model name
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    // create context string with index
    const contextString = contexts.map((c, i) => `[${i + 1}] ${c.text}`).join("\n");

    // ✅ improved prompt
    const prompt = `
You are a helpful assistant. 
Answer the question using ONLY the provided context. 
Do NOT repeat the entire context, only summarize or extract relevant parts. 
Keep it concise (max 5 sentences). 
Use numbered citations like [1], [2] if needed.

Question: ${query}

Context:
${contextString}
`;

    // generate response
    const result = await model.generateContent(prompt);
    return result.response.text();

  } catch (e) {
    console.error("Gemini synthesis error:", e);

    // fallback: return first few chunks if Gemini fails
    return contexts.slice(0, 3).map(c => c.text).join(" ");
  }
}