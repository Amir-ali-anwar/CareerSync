import { OpenAI } from "openai";
import dotenv from "dotenv";

dotenv.config();

const openAi = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export const generateEmbedding = async (text) => {
  const response = await openAi.embeddings.create({
    model: "text-embedding-3-small",
    input: text,
  });
  return response.data[0].embedding;
};
