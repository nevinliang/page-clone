import OpenAI from "openai";

let client: OpenAI | null = null;

export function getOpenAIClient(apiKey: string): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey });
  }
  return client;
}
