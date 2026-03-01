import { Command } from "commander";
import chalk from "chalk";
import ora from "ora";
import { record } from "./recorder/index.js";
import { serve } from "./server/index.js";
import type { PageCloneConfig } from "./types.js";

const program = new Command();

program
  .name("page-clone")
  .description("Clone a web page for AI agent testing with mocked APIs")
  .argument("<url>", "URL of the page to clone")
  .option("-p, --port <number>", "port to serve on", "3000")
  .option("--record-only", "only record, do not start server")
  .option("--output <dir>", "output directory for recordings")
  .option("--wait <ms>", "extra wait time after page load (ms)", "2000")
  .action(async (url: string, opts) => {
    // Validate URL
    try {
      new URL(url);
    } catch {
      console.error(chalk.red(`Invalid URL: ${url}`));
      process.exit(1);
    }

    const config: PageCloneConfig = {
      url,
      port: parseInt(opts.port, 10),
      openaiApiKey: process.env.OPENAI_API_KEY,
      recordOnly: !!opts.recordOnly,
      outputDir: opts.output,
      waitTime: parseInt(opts.wait, 10),
    };

    console.log("");
    console.log(chalk.bold("  page-clone"));
    console.log(chalk.dim(`  Cloning ${url}`));
    console.log("");

    const spinner = ora({ indent: 2 });

    try {
      // Record
      const recording = await record(config, (msg) => {
        spinner.start(msg);
      });
      spinner.succeed(
        `Found ${recording.endpoints.length} API endpoint(s)`
      );
      console.log(chalk.dim(`  Saved to ${recording.outputDir}`));

      if (config.recordOnly) {
        console.log("");
        console.log(chalk.green("  Recording complete."));
        process.exit(0);
      }

      // Serve
      spinner.start("Starting server...");
      spinner.stop();
      await serve(recording, config);
    } catch (err) {
      spinner.fail("Failed");
      console.error(chalk.red(`\n  ${err}`));
      process.exit(1);
    }
  });

program.parse();
