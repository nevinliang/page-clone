import path from "path";
import { mkdirSync } from "fs";

export function resolveOutputDir(config: {
  url: string;
  outputDir?: string;
}): string {
  if (config.outputDir) return config.outputDir;

  const domain = new URL(config.url).hostname.replace(/\./g, "_");
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .slice(0, 19);

  const dir = path.join(process.cwd(), "recordings", `${domain}-${timestamp}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}
