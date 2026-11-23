import { readFile, writeFile } from "fs/promises";
import { join } from "path";

import { replaceSection } from "./changes";
import logger from "./logger";

const README_PATH = join(process.cwd(), "README.md");
const DOMAINS_PATH = join(process.cwd(), "domains.json");

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

  const updated = replaceSection(readme, "STATS", table);

  await writeFile(README_PATH, updated, "utf8");
  logger.info(
    `✓ README.md stats updated - ${total.toLocaleString("en-US")} domains, ${source_count} sources`,
  );
}

main().catch((err) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
