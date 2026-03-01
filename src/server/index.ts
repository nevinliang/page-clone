import express from "express";
import cors from "cors";
import chalk from "chalk";
import type { Recording, PageCloneConfig } from "../types.js";
import { setupStaticRoutes } from "./static-routes.js";
import { setupMockRoutes } from "./mock-routes.js";
import { setupCatchAll } from "./catch-all.js";

export async function serve(
  recording: Recording,
  config: PageCloneConfig
): Promise<void> {
  const app = express();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cors());

  // Request logging
  app.use((req, _res, next) => {
    console.log(chalk.dim(`  ${req.method} ${req.path}`));
    next();
  });

  // Order matters: mock API routes first, then static, then catch-all
  setupMockRoutes(app, recording);
  setupStaticRoutes(app, recording, config.port);
  setupCatchAll(app, recording, config);

  return new Promise((resolve) => {
    app.listen(config.port, () => {
      console.log("");
      console.log(
        chalk.green.bold(`  Clone ready at http://localhost:${config.port}`)
      );
      console.log(chalk.dim(`  Source: ${recording.sourceUrl}`));
      console.log(
        chalk.dim(`  Mocked ${recording.endpoints.length} API endpoint(s)`)
      );

      if (recording.endpoints.length > 0) {
        console.log("");
        for (const ep of recording.endpoints) {
          console.log(
            chalk.cyan(`    ${ep.method.padEnd(7)} ${ep.path}`) +
              chalk.dim(` → ${ep.statusCode}`)
          );
        }
      }

      console.log("");
      console.log(chalk.dim("  Press Ctrl+C to stop"));
      console.log("");
      resolve();
    });
  });
}
