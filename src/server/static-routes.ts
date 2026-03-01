import { readFile } from "fs/promises";
import type { Express } from "express";
import type { Recording } from "../types.js";
import { generateOriginRewriteScript } from "./origin-rewriter.js";

export function setupStaticRoutes(
  app: Express,
  recording: Recording,
  port: number
): void {
  const localOrigin = `http://localhost:${port}`;

  app.get("/", async (_req, res) => {
    let html = await readFile(recording.snapshotPath, "utf-8");

    // DON'T do a blanket replaceAll of the origin — that breaks <base href>,
    // <link>, <img src>, and other static asset references that need to keep
    // pointing at the original server. The monkey-patch script below handles
    // rewriting fetch/XHR API calls; static assets should load from the real origin.

    // Inject origin-rewrite script as the first thing in <head>
    const rewriteScript = generateOriginRewriteScript(
      recording.sourceOrigin,
      localOrigin
    );

    if (html.includes("<head>")) {
      html = html.replace("<head>", `<head>${rewriteScript}`);
    } else if (html.includes("<HEAD>")) {
      html = html.replace("<HEAD>", `<HEAD>${rewriteScript}`);
    } else {
      html = rewriteScript + html;
    }

    // Strip CSP meta tags that would block our injected script
    html = html.replace(
      /<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
      "<!-- CSP removed by page-clone -->"
    );

    res.type("html").send(html);
  });

  // If the original URL had a non-root path, redirect it to /
  const sourcePath = new URL(recording.sourceUrl).pathname;
  if (sourcePath !== "/") {
    app.get(sourcePath, (_req, res) => {
      res.redirect("/");
    });
  }
}
