import { getOpenAIClient } from "./index.js";
import type { RecordedEndpoint } from "../types.js";

interface MockInput {
  method: string;
  path: string;
  query: Record<string, unknown>;
  body: unknown;
  recordedEndpoints: RecordedEndpoint[];
  sourceUrl: string;
}

interface MockOutput {
  statusCode: number;
  body: string;
}

export async function generateMockResponse(
  input: MockInput,
  apiKey: string
): Promise<MockOutput> {
  const client = getOpenAIClient(apiKey);

  // Build context from recorded endpoints
  const examples = input.recordedEndpoints.slice(0, 10).map((ep) => ({
    method: ep.method,
    path: ep.path,
    statusCode: ep.statusCode,
    responsePreview: ep.responseBody.slice(0, 500),
    contentType: ep.contentType,
  }));

  const prompt = `You are a mock API server for a cloned web page.

The original page was: ${input.sourceUrl}

Here are examples of recorded API endpoints from the real site:
${JSON.stringify(examples, null, 2)}

The cloned page is making a request that was NOT recorded:
- Method: ${input.method}
- Path: ${input.path}
- Query: ${JSON.stringify(input.query)}
- Body: ${JSON.stringify(input.body)}

Generate a plausible mock response. Match the naming conventions and data shapes from the recorded endpoints.

Respond with ONLY a JSON object:
{
  "statusCode": <number>,
  "body": <the response body as a JSON value>
}`;

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 2000,
    response_format: { type: "json_object" },
  });

  const text = completion.choices[0]?.message?.content || "{}";

  try {
    const parsed = JSON.parse(text);
    return {
      statusCode: parsed.statusCode || 200,
      body:
        typeof parsed.body === "string"
          ? parsed.body
          : JSON.stringify(parsed.body),
    };
  } catch {
    return { statusCode: 200, body: JSON.stringify({ mock: true }) };
  }
}
