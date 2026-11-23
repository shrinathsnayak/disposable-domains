import { readFile, writeFile } from "fs/promises";

import { ALLOWLIST_SOURCES, ALLOWED_DOMAINS } from "./allowed-sources";
import { BLOCKED_SOURCES, MANUAL_BLOCKED_DOMAINS } from "./blocked-sources";
import {
  diffDomains,
  findSuspiciousChanges,
  prependEntry,
  readSummaries,
  renderEntry,
  renderPreview,
  replaceSection,
} from "./changes";
import {
  CHANGE_LIMITS,
  CHANGES_FILE,
  CHANGES_KEEP_ENTRIES,
  DOMAIN_RE,
  IANA_TLD_URL,
  OUTPUT_FILE,
  OUTPUT_TXT_FILE,
  README_FILE,
  README_PREVIEW_RUNS,
} from "./constants";
import logger from "./logger";
import type { Source, SourceStat } from "./types";
import { fetchSource, fetchText, finalizeDomains, parseTldList, runWithConcurrency } from "./utils";

interface Output {
  meta: { generated_on: string; total: number; source_count: number; sources: SourceStat[] };
  domains: string[];
}

/** Reads a file, returning `null` if it does not exist. */
async function readOptional(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

/**
 * Records what changed since the previous output in CHANGES.md and refreshes the
 * README preview. Runs that changed nothing leave both files untouched.
 */
async function updateChangeReport(previous: Output | null, next: Output): Promise<void> {
  if (previous === null) {
    logger.info(`No previous ${OUTPUT_FILE} - skipping change report`);
    return;
  }
  const { added, removed } = diffDomains(previous.domains, next.domains);
  if (added.length === 0 && removed.length === 0) {
    logger.info("No domain changes since the previous run - change report untouched");
    return;
  }

  const summary = {
    date: next.meta.generated_on.slice(0, 16).replace("T", " ") + " UTC",
    added: added.length,
    removed: removed.length,
    total: next.meta.total,
  };
  const entry = renderEntry(summary);
  const report = prependEntry(await readOptional(CHANGES_FILE), entry, CHANGES_KEEP_ENTRIES);
  await writeFile(CHANGES_FILE, report, "utf8");

  const preview = renderPreview(readSummaries(report).slice(0, README_PREVIEW_RUNS), CHANGES_FILE);
  const readme = await readFile(README_FILE, "utf8");
  await writeFile(README_FILE, replaceSection(readme, "CHANGES", preview), "utf8");
  logger.info(`✓ ${CHANGES_FILE} updated - +${added.length} / −${removed.length}`);
}

async function main(): Promise<void> {
  const startTime = Date.now();
  logger.info(
    ALLOWLIST_SOURCES.length > 0
      ? `Fetching ${ALLOWLIST_SOURCES.length} allowlist source(s) + ${BLOCKED_SOURCES.length} blocklist sources`
      : `Fetching ${BLOCKED_SOURCES.length} blocklist sources (no allowlist sources)`,
  );

  const allowlistPromises = ALLOWLIST_SOURCES.map((source) => fetchSource(source));
  const tldPromise = fetchText(IANA_TLD_URL).then((text) =>
    text === null ? null : parseTldList(text),
  );

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

  const tlds = await tldPromise;
  if (tlds === null) {
    logger.warn(`IANA TLD list unavailable or incomplete - skipping TLD filtering`);
  }

  const { domains: sorted, unknownTldCount } = finalizeDomains(allDomains, allowlist, tlds);
  if (tlds !== null) {
    logger.info(`Removed ${unknownTldCount.toLocaleString()} domains with unknown TLDs`);
  }

  const previousText = await readOptional(OUTPUT_FILE);
  const previous = previousText === null ? null : (JSON.parse(previousText) as Output);

  const output: Output = {
    meta: {
      generated_on: new Date().toISOString(),
      total: sorted.length,
      source_count: BLOCKED_SOURCES.length,
      sources: stats,
    },
    domains: sorted,
  };

  if (previous !== null) {
    const problems = findSuspiciousChanges(previous.meta, output.meta, CHANGE_LIMITS);
    if (problems.length > 0 && process.env.ALLOW_LARGE_CHANGES !== "1") {
      throw new Error(
        `Refusing to publish: this run differs sharply from the previous one.\n- ${problems.join("\n- ")}\n` +
          `Nothing was written. Check the sources above, then re-run with ALLOW_LARGE_CHANGES=1 ` +
          `(or the "allow_large_changes" input of the workflow) if the change is legitimate.`,
      );
    }
    for (const problem of problems)
      logger.warn(`Large change allowed by ALLOW_LARGE_CHANGES: ${problem}`);
  }

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n", "utf8");
  await writeFile(OUTPUT_TXT_FILE, sorted.join("\n") + "\n", "utf8");
  await updateChangeReport(previous, output);
  logger.info(
    `✓ Written ${OUTPUT_FILE} and ${OUTPUT_TXT_FILE} - ${sorted.length.toLocaleString()} unique domains from ${BLOCKED_SOURCES.length} sources.`,
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
