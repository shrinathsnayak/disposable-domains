import { writeFile } from "fs/promises";

import { ALLOWLIST_URL, ALLOWED_DOMAINS } from "./allowed-sources";
import { BLOCKED_SOURCES } from "./blocked-sources";
import { OUTPUT_FILE } from "./constants";
import logger from "./logger";
import type { Source, SourceStat } from "./types";
import { fetchSource, fetchText, parseLines, runWithConcurrency } from "./utils";

async function main(): Promise<void> {
  const startTime = Date.now();
  logger.info(`Fetching allowlist + ${BLOCKED_SOURCES.length} sources`);

  const allowlistPromise = fetchText(ALLOWLIST_URL);

  const allDomains = new Set<string>();
  const stats: SourceStat[] = [];

  await runWithConcurrency(BLOCKED_SOURCES as Source[], async (source) => {
    const result = await fetchSource(source);
    for (const domain of result.domains) allDomains.add(domain);
    stats.push({
      name: result.source.name,
      url: result.source.url,
      raw_count: result.domains.length,
      status: result.status,
    });
  });

  const allowResult = await allowlistPromise;
  const allowlist = new Set([...(allowResult ? parseLines(allowResult) : []), ...ALLOWED_DOMAINS]);
  logger.info(`Allowlist: ${allowlist.size.toLocaleString()} domains`);

  for (const domain of allowlist) allDomains.delete(domain);

  const sorted = [...allDomains].sort();

  const output = {
    meta: {
      generated_on: new Date().toISOString(),
      total: sorted.length,
      source_count: BLOCKED_SOURCES.length,
      sources: stats,
    },
    domains: sorted,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n", "utf8");
  logger.info(
    `✓ Written ${OUTPUT_FILE} — ${sorted.length.toLocaleString()} unique domains from ${BLOCKED_SOURCES.length} sources.`,
  );
  logger.info(`Time taken: ${((Date.now() - startTime) / 1000).toFixed(2)} seconds`);
  logger.info(`Generated at: ${new Date().toISOString()}`);
  logger.info(`Total domains: ${sorted.length}`);
  logger.info(`Total sources: ${BLOCKED_SOURCES.length}`);
}

main().catch((err) => {
  logger.error(err instanceof Error ? err.message : String(err));
  process.exit(1);
});
