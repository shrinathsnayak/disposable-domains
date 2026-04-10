import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import logger from "./logger";

const README_PATH = join(process.cwd(), "README.md");
const DOMAINS_PATH = join(process.cwd(), "domains.json");

const STATS_START = "<!-- STATS_START -->";
const STATS_END = "<!-- STATS_END -->";

async function main(): Promise<void> {
  const raw = await readFile(DOMAINS_PATH, "utf8");
  const data = JSON.parse(raw) as {
    meta: { generated_on: string; total: number; source_count: number };
  };

  const { total, source_count, generated_on } = data.meta;
  const generatedDate = new Date(generated_on).toUTCString();

  const table = [
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Disposable Domains | ${total.toLocaleString("en-US")} |`,
    `| Sources | ${source_count} |`,
    `| Generated on | ${generatedDate} |`,
  ].join("\n");

  const readme = await readFile(README_PATH, "utf8");

  const startIdx = readme.indexOf(STATS_START);
  const endIdx = readme.indexOf(STATS_END);

  if (startIdx === -1 || endIdx === -1) {
    throw new Error("Could not find STATS_START / STATS_END markers in README.md");
  }

  const updated =
    readme.slice(0, startIdx + STATS_START.length) + "\n" + table + "\n" + readme.slice(endIdx);

  await writeFile(README_PATH, updated, "utf8");
  logger.info(
    `✓ README.md stats updated — ${total.toLocaleString("en-US")} domains, ${source_count} sources`,
  );
}

main().catch((err) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
