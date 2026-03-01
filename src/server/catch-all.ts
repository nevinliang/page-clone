import type { Express, Request, Response } from "express";
import type { Recording, PageCloneConfig } from "../types.js";
import { generateMockResponse } from "../llm/mock-generator.js";

export function setupCatchAll(
  app: Express,
  recording: Recording,
  config: PageCloneConfig
): void {
  app.all("*", async (req: Request, res: Response) => {
    const reqPath = req.path;

    // Skip static assets and favicon
    if (
      /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?|ttf|eot|map)$/i.test(reqPath)
    ) {
      res.status(404).send("Not found (asset not recorded)");
      return;
    }
    if (reqPath === "/favicon.ico") {
      res.status(404).end();
      return;
    }

    console.log(`  [catch-all] ${req.method} ${reqPath}`);

    // If no API key, return a generic response
    if (!config.openaiApiKey) {
      res.set("X-Page-Clone", "no-llm");
      res.json({ message: "Mock response (no LLM configured)" });
      return;
    }

    try {
      const mock = await generateMockResponse(
        {
          method: req.method,
          path: reqPath,
          query: req.query as Record<string, unknown>,
          body: req.body,
          recordedEndpoints: recording.endpoints,
          sourceUrl: recording.sourceUrl,
        },
        config.openaiApiKey
      );

      res.set("X-Page-Clone", "llm-generated");
      res.set("Content-Type", "application/json");
      res.status(mock.statusCode).send(mock.body);
    } catch (err) {
      console.error("  LLM mock generation failed:", err);
      res.status(500).json({ error: "Mock generation failed" });
    }
  });
}
