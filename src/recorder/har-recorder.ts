import path from "path";
import { chromium } from "playwright";

export async function recordHar(
  url: string,
  outputDir: string,
  waitTime: number
): Promise<string> {
  const harPath = path.join(outputDir, "recording.har");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordHar: {
      path: harPath,
      content: "embed",
      mode: "full",
    },
  });

  const page = await context.newPage();
  // Use "load" instead of "networkidle" — many sites (ads, analytics,
  // WebSockets) never reach networkidle and would timeout
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(waitTime);

  // Close context to flush HAR to disk
  await context.close();
  await browser.close();

  return harPath;
}
