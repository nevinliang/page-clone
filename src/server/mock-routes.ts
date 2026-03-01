import type { Express, Request, Response } from "express";
import type { Recording } from "../types.js";

export function setupMockRoutes(app: Express, recording: Recording): void {
  for (const endpoint of recording.endpoints) {
    const method = endpoint.method.toLowerCase() as
      | "get"
      | "post"
      | "put"
      | "delete"
      | "patch"
      | "options";

    // Strip query string for route matching
    const routePath = endpoint.path.split("?")[0];

    // Register the mock route
    app[method](routePath, (_req: Request, res: Response) => {
      // Forward select response headers
      for (const header of ["content-type", "cache-control"]) {
        if (endpoint.responseHeaders[header]) {
          res.set(header, endpoint.responseHeaders[header]);
        }
      }

      res.set("Access-Control-Allow-Origin", "*");
      res.set("X-Page-Clone", "static-mock");
      res.status(endpoint.statusCode);

      if (endpoint.contentType.includes("application/json")) {
        try {
          res.json(JSON.parse(endpoint.responseBody));
        } catch {
          res.send(endpoint.responseBody);
        }
      } else {
        res.send(endpoint.responseBody);
      }
    });

    // CORS preflight
    app.options(routePath, (_req: Request, res: Response) => {
      res.set("Access-Control-Allow-Origin", "*");
      res.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, PATCH, OPTIONS"
      );
      res.set("Access-Control-Allow-Headers", "*");
      res.status(204).end();
    });
  }
}
