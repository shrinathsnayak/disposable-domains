import { writeFile } from "fs/promises";
import { SOURCES, ALLOWLIST_URL } from "./sources";
import type { SourceStat } from "./types";
import { fetchText, fetchSource, parseLines } from "./utils";
import { OUTPUT_FILE } from "./constants";

/**
 * Entry point for the disposable-domain aggregator.
 *
 * Orchestrates the full pipeline:
 *
 * 1. **Parallel fetch** — the allowlist and all domain sources are fetched
 *    concurrently via `Promise.all` to minimise total wall-clock time.
 * 2. **Allowlist filtering** — any domain that appears in the allowlist
 *    (legitimate providers mistakenly flagged as disposable) is excluded
 *    before being added to the output set.
 * 3. **Deduplication** — a `Set` ensures each domain appears exactly once
 *    regardless of how many sources include it.
 * 4. **Output** — domains are sorted alphabetically and written to
 *    {@link OUTPUT_FILE} as a JSON object containing metadata and the
 *    deduplicated domain list.
 *
 * The function never throws; any source that fails to fetch is recorded in
 * the metadata with `status: "error"` and its domains are skipped.
 *
 * @returns A promise that resolves when `domains.json` has been written.
 */
async function main(): Promise<void> {
  // 1. Fetch allowlist and all sources in parallel
  console.log("Fetching allowlist and all sources in parallel…\n");
  const [allowResult, ...sourceResults] = await Promise.all([
    fetchText(ALLOWLIST_URL),
    ...SOURCES.map(fetchSource),
  ]);

  const allowlist = new Set(allowResult ? parseLines(allowResult) : []);
  console.log(`\nAllowlist: ${allowlist.size.toLocaleString()} domains\n`);

  // 2. Merge results, skipping allowlisted domains
  const allDomains = new Set<string>();
  const stats: SourceStat[] = [];

  for (const result of sourceResults) {
    for (const domain of result.domains) {
      if (!allowlist.has(domain)) allDomains.add(domain);
    }
    stats.push({
      name: result.source.name,
      url: result.source.url,
      raw_count: result.domains.length,
      status: result.status,
    });
  }

  // 3. Sort and write
  const sorted = [...allDomains].sort();

  const output = {
    meta: {
      generated_at: new Date().toISOString(),
      total: sorted.length,
      source_count: SOURCES.length,
      sources: stats,
    },
    domains: sorted,
  };

  await writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`✓ Written ${OUTPUT_FILE} — ${sorted.length.toLocaleString()} unique domains from ${SOURCES.length} sources`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
