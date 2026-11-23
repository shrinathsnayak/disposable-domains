export const OUTPUT_FILE = "domains.json";
export const OUTPUT_TXT_FILE = "domains.txt";
export const STRICT_TXT_FILE = "domains-strict.txt";
/** A domain is in the strict list when at least this many independent projects list it. */
export const STRICT_MIN_SOURCES = 2;
export const CHANGES_FILE = "CHANGES.md";
export const README_FILE = "README.md";
/** Number of runs kept in the change report. */
export const CHANGES_KEEP_ENTRIES = 30;
/**
 * Publishing is refused when a run looks like a broken or poisoned upstream
 * (override with ALLOW_LARGE_CHANGES=1 after reviewing it).
 */
export const CHANGE_LIMITS = {
  maxTotalDrop: 0.05,
  maxSourceGrowth: 0.5,
  minSourceGrowthCount: 1000,
};
/** Runs shown in the README preview table. */
export const README_PREVIEW_RUNS = 7;
export const USER_AGENT = "disposable-domain-aggregator/1.0";
export const FETCH_TIMEOUT_MS = 30_000;
export const CONCURRENCY_LIMIT = 8;
export const DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;
export const COMMENT_PREFIXES = ["#", "//", ";"];
export const IANA_TLD_URL = "https://data.iana.org/TLD/tlds-alpha-by-domain.txt";
/** A parsed TLD list smaller than this is treated as a bad fetch, so TLD filtering is skipped. */
export const MIN_TLD_COUNT = 1000;
