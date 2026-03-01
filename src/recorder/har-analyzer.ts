import path from "path";
import { readFile } from "fs/promises";
import { RecordedEndpoint } from "../types.js";

const STATIC_ASSET_EXTENSIONS = new Set([
  ".js",
  ".css",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".svg",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".map",
  ".webp",
  ".avif",
  ".mp4",
  ".webm",
]);

const API_CONTENT_TYPES = [
  "application/json",
  "application/xml",
  "text/xml",
  "text/plain",
];

const API_RESOURCE_TYPES = ["xhr", "fetch"];

export async function analyzeHar(
  harPath: string,
  sourceUrl: string
): Promise<RecordedEndpoint[]> {
  const harContent = await readFile(harPath, "utf-8");
  const har = JSON.parse(harContent);

  const sourceOrigin = new URL(sourceUrl).origin;
  const sourcePathname = new URL(sourceUrl).pathname;
  const endpoints: RecordedEndpoint[] = [];

  for (const entry of har.log.entries) {
    const url = new URL(entry.request.url);
    const entryPath = url.pathname + url.search;

    // Only mock same-origin requests
    if (url.origin !== sourceOrigin) continue;

    // Skip static assets
    const ext = path.extname(url.pathname).toLowerCase();
    if (STATIC_ASSET_EXTENSIONS.has(ext)) continue;

    const responseContentType = getContentType(entry.response);

    // Skip the page navigation itself
    if (
      entryPath === sourcePathname &&
      entry.request.method === "GET" &&
      responseContentType.includes("text/html")
    ) {
      continue;
    }

    // Check if this looks like an API call
    const isApiContentType = API_CONTENT_TYPES.some((ct) =>
      responseContentType.includes(ct)
    );
    const isApiPath = /\/(api|graphql|v[0-9]+|rest)\//i.test(url.pathname);
    const isXhrFetch =
      entry._resourceType &&
      API_RESOURCE_TYPES.includes(entry._resourceType);

    if (!isApiContentType && !isApiPath && !isXhrFetch) continue;

    endpoints.push({
      method: entry.request.method,
      path: url.pathname + url.search,
      originalUrl: entry.request.url,
      requestHeaders: headersToRecord(entry.request.headers),
      requestBody: entry.request.postData?.text,
      statusCode: entry.response.status,
      responseHeaders: headersToRecord(entry.response.headers),
      responseBody: entry.response.content?.text || "",
      contentType: responseContentType,
    });
  }

  // Deduplicate by method+path, keep last occurrence
  const deduped = new Map<string, RecordedEndpoint>();
  for (const ep of endpoints) {
    const key = `${ep.method}:${ep.path}`;
    deduped.set(key, ep);
  }

  return Array.from(deduped.values());
}

function getContentType(response: {
  headers?: Array<{ name: string; value: string }>;
}): string {
  const header = response.headers?.find(
    (h) => h.name.toLowerCase() === "content-type"
  );
  return header?.value || "";
}

function headersToRecord(
  headers: Array<{ name: string; value: string }>
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const h of headers) {
    record[h.name.toLowerCase()] = h.value;
  }
  return record;
}
