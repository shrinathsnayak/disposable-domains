import { writeFile } from "fs/promises";

import { ALLOWLIST_SOURCES, ALLOWED_DOMAINS } from "./allowed-sources";
import { BLOCKED_SOURCES, MANUAL_BLOCKED_DOMAINS } from "./blocked-sources";
import { DOMAIN_RE, OUTPUT_FILE } from "./constants";
import logger from "./logger";
import type { Source, SourceStat } from "./types";
import { fetchSource, runWithConcurrency } from "./utils";

async function main(): Promise<void> {
  const startTime = Date.now();
  logger.info(
    ALLOWLIST_SOURCES.length > 0
      ? `Fetching ${ALLOWLIST_SOURCES.length} allowlist source(s) + ${BLOCKED_SOURCES.length} blocklist sources`
      : `Fetching ${BLOCKED_SOURCES.length} blocklist sources (no allowlist sources)`,
  );

  const allowlistPromises = ALLOWLIST_SOURCES.map((source) => fetchSource(source));

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

  let manualBlockedValid = 0;
  let manualBlockedInvalid = 0;
  for (const raw of MANUAL_BLOCKED_DOMAINS) {
    const d = raw.trim().toLowerCase();
    if (DOMAIN_RE.test(d)) {
      allDomains.add(d);
      manualBlockedValid++;
    } else {
      manualBlockedInvalid++;
    }
  }
  if (MANUAL_BLOCKED_DOMAINS.length > 0) {
    logger.info(
      `Manual blocked: ${manualBlockedValid.toLocaleString()} valid label(s) merged (${manualBlockedInvalid.toLocaleString()} invalid skipped)`,
    );
  }

  const allowResults = await Promise.all(allowlistPromises);
  const allowlist = new Set<string>(ALLOWED_DOMAINS);
  for (const { domains } of allowResults) {
    for (const domain of domains) allowlist.add(domain);
  }
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
