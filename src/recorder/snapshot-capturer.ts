import path from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { writeFile } from "fs/promises";
import { chromium } from "playwright";

const execFileAsync = promisify(execFile);

function getChromiumPath(): string {
  // Use Playwright's bundled chromium
  const browser = chromium;
  return (browser as any).executablePath();
}

export async function captureSnapshot(
  url: string,
  outputDir: string
): Promise<string> {
  const snapshotPath = path.join(outputDir, "snapshot.html");

  try {
    return await captureWithSingleFile(url, snapshotPath);
  } catch (err) {
    console.warn(
      `  SingleFile failed (${err instanceof Error ? err.message : err}), using fallback...`
    );
    return await captureWithPlaywright(url, snapshotPath);
  }
}

async function captureWithSingleFile(
  url: string,
  snapshotPath: string
): Promise<string> {
  const singleFileBin = path.join(
    path.dirname(
      new URL(import.meta.resolve("single-file-cli/package.json")).pathname
    ),
    "single-file-node.js"
  );

  const chromiumPath = getChromiumPath();

  await execFileAsync(
    "node",
    [
      singleFileBin,
      url,
      snapshotPath,
      "--browser-executable-path",
      chromiumPath,
      "--browser-headless",
      "true",
      "--browser-wait-until",
      "load",
      "--browser-load-max-time",
      "60000",
    ],
    { timeout: 90_000 }
  );

  return snapshotPath;
}

async function captureWithPlaywright(
  url: string,
  snapshotPath: string
): Promise<string> {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(2000);

  const content = await page.content();
  const origin = new URL(url).origin;
  let html: string;
  if (content.includes("<head>")) {
    html = content.replace("<head>", `<head><base href="${origin}/">`);
  } else if (content.includes("<HEAD>")) {
    html = content.replace("<HEAD>", `<HEAD><base href="${origin}/">`);
  } else {
    html = `<base href="${origin}/">` + content;
  }

  await writeFile(snapshotPath, html, "utf-8");
  await browser.close();
  return snapshotPath;
}
