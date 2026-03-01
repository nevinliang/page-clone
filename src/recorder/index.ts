import path from "path";
import { writeFile } from "fs/promises";
import { resolveOutputDir } from "../utils.js";
import { recordHar } from "./har-recorder.js";
import { captureSnapshot } from "./snapshot-capturer.js";
import { analyzeHar } from "./har-analyzer.js";
import type { PageCloneConfig, Recording } from "../types.js";

export async function record(
  config: PageCloneConfig,
  log: (msg: string) => void
): Promise<Recording> {
  const outputDir = resolveOutputDir(config);

  log("Capturing page with Playwright...");
  const harPath = await recordHar(config.url, outputDir, config.waitTime);

  log("Snapshotting DOM...");
  const snapshotPath = await captureSnapshot(config.url, outputDir);

  log("Analyzing network traffic...");
  const endpoints = await analyzeHar(harPath, config.url);

  const endpointsPath = path.join(outputDir, "api-endpoints.json");
  await writeFile(endpointsPath, JSON.stringify(endpoints, null, 2));

  return {
    sourceUrl: config.url,
    sourceOrigin: new URL(config.url).origin,
    snapshotPath,
    harPath,
    endpoints,
    recordedAt: new Date().toISOString(),
    outputDir,
  };
}
