import 'dotenv/config';
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

export async function embedTexts(texts) {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const embeddings = [];
  for (const t of texts) {
    const result = await model.embedContent(t);
    embeddings.push(result.embedding.values);
  }
  return embeddings;
}
