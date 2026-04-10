import _ from "lodash";
import { z } from "zod";
import type { Source } from "./types";
import {
  USER_AGENT,
  FETCH_TIMEOUT_MS,
  DOMAIN_RE,
  COMMENT_PREFIXES,
  CONCURRENCY_LIMIT,
} from "./constants";
import logger from "./logger";

/**
 * Runs `fn` over every item with at most `limit` in-flight at once.
 * Items are dispatched in order; the next one starts as soon as a slot frees.
 */
export async function runWithConcurrency<T>(
  items: T[],
  fn: (item: T) => Promise<void>,
): Promise<void> {
  const queue = [...items];
  const active = new Set<Promise<void>>();

  function dispatch(): void {
    if (queue.length === 0) return;
    const item = queue.shift()!;
    const p: Promise<void> = fn(item).finally(() => {
      active.delete(p);
      dispatch();
    });
    active.add(p);
  }

  for (let i = 0; i < Math.min(CONCURRENCY_LIMIT, items.length); i++) dispatch();
  while (active.size > 0) await Promise.race(active);
}

/**
 * Fetches the raw text content of a URL.
 *
 * Sends a GET request with a custom `User-Agent` header and a configurable
 * timeout. Any network error or non-2xx response is caught and logged; the
 * function returns `null` in those cases so callers can handle failures
 * gracefully without throwing.
 *
 * @param url - The fully-qualified URL to fetch.
 * @returns The response body as a string, or `null` if the request failed.
 */
export async function fetchText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(`✗ ${url}: ${message}`);
    return null;
  }
}

/**
 * Parses a newline-delimited plain-text domain list.
 *
 * Each line is trimmed and lowercased. Lines that are empty or begin with a
 * comment marker (`#`, `//`, `;`) are dropped. Leading `@` prefixes and
 * trailing dots are stripped. Only lines matching {@link DOMAIN_RE} are kept.
 *
 * @param text - Raw file content of a plain-text domain list.
 * @returns Array of normalised, validated domain strings.
 */
export function parseLines(text: string): string[] {
  const result: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim().toLowerCase();
    if (!line || COMMENT_PREFIXES.some((p) => line.startsWith(p))) continue;
    const domain = line.replace(/^@+/, "").replace(/\.$/, "");
    if (DOMAIN_RE.test(domain)) result.push(domain);
  }
  return result;
}

const domainArraySchema = z.array(z.unknown()).transform((arr) =>
  _(arr)
    .filter((d): d is string => typeof d === "string")
    .map((d) => _.trim(d).toLowerCase())
    .filter((d) => DOMAIN_RE.test(d))
    .value(),
);

/**
 * Parses a JSON array of domain strings.
 *
 * Uses a zod schema to validate the top-level structure is an array, then
 * normalises each string entry. Non-string elements are silently ignored.
 *
 * @param text - Raw JSON file content.
 * @returns Array of normalised, validated domain strings.
 */
export function parseJsonArray(text: string): string[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    logger.error(`JSON parse error: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }
  const result = domainArraySchema.safeParse(raw);
  return result.success ? result.data : [];
}

/**
 * Parses a JSON object where a named key holds the domain array.
 *
 * Validated with zod. Handles two shapes:
 * - Flat: `{ "<key>": ["domain.com", ...] }` — elements are strings.
 * - Nested: `{ "<key>": [{ "<subkey>": "domain.com" }, ...] }` — elements are
 *   objects; `subkey` names the property holding the domain string.
 *
 * @param text   - Raw JSON content.
 * @param key    - Top-level property that holds the array (e.g. `"domains"`).
 * @param subkey - Optional property name within each array element.
 * @returns Array of normalised, validated domain strings.
 */
export function parseJsonObject(text: string, key: string, subkey?: string): string[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    logger.error(`JSON parse error: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }

  const objSchema = z.record(z.string(), z.unknown());
  const objResult = objSchema.safeParse(raw);
  if (!objResult.success || Array.isArray(raw)) return [];

  const arr = objResult.data[key];
  if (!Array.isArray(arr)) return [];

  return _(arr)
    .map((item): string | null => {
      if (subkey) {
        const nested = z.record(z.string(), z.unknown()).safeParse(item);
        const val = nested.success ? nested.data[subkey] : undefined;
        return typeof val === "string" ? val : null;
      }
      return typeof item === "string" ? item : null;
    })
    .compact()
    .map((d) => _.trim(d).toLowerCase())
    .filter((d) => DOMAIN_RE.test(d))
    .value();
}

/**
 * Parses a JSON object where domain names are keys and classification strings
 * are values — e.g. `{ "mailinator.com": "disposable", "gmail.com": "freemail" }`.
 *
 * When `valueFilter` is provided, only domains whose value strictly equals
 * that string are included (e.g. `"disposable"` to exclude freemail entries).
 *
 * @param text        - Raw JSON content.
 * @param valueFilter - Optional value to filter on (e.g. `"disposable"`).
 * @returns Array of normalised, validated domain strings.
 */
export function parseJsonObjectKeys(text: string, valueFilter?: string): string[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (err) {
    logger.error(`JSON parse error: ${err instanceof Error ? err.message : String(err)}`);
    return [];
  }

  const schema = z.record(z.string(), z.string());
  const result = schema.safeParse(raw);
  if (!result.success) return [];

  return _(result.data)
    .pickBy((val) => (valueFilter ? val === valueFilter : true))
    .keys()
    .map((d) => _.trim(d).toLowerCase())
    .filter((d) => DOMAIN_RE.test(d))
    .value();
}

/**
 * Dispatches raw text to the correct parser based on the source format.
 *
 * @param text   - Raw file content to parse.
 * @param format - The expected format of the content.
 * @param key    - For `json_object`: the top-level key holding the domain array.
 * @param subkey - For `json_object`: the per-element key holding the domain string.
 * @returns Array of normalised, validated domain strings.
 */
export function parseDomains(
  text: string,
  format: Source["format"],
  key?: string,
  subkey?: string,
  value_filter?: string,
): string[] {
  if (format === "lines") return parseLines(text);
  if (format === "json_array") return parseJsonArray(text);
  if (format === "json_object") return parseJsonObject(text, key ?? "domains", subkey);
  if (format === "json_object_keys") return parseJsonObjectKeys(text, value_filter);
  throw new Error(`Unknown format: ${format as string}`);
}

/**
 * Fetches and parses a single domain source.
 *
 * Combines {@link fetchText} and {@link parseDomains} into a single
 * async operation. Always resolves — never rejects — so it is safe to use
 * inside `Promise.all`. On fetch failure the returned `domains` array is
 * empty and `status` is `"error"`.
 *
 * @param source - The source descriptor containing `name`, `url`, and `format`.
 * @returns An object with the original `source`, the parsed `domains` array,
 *          and a `status` of `"ok"` or `"error"`.
 */
export async function fetchSource(
  source: Source,
): Promise<{ source: Source; domains: string[]; status: "ok" | "error" }> {
  logger.info(`Fetching ${source.name}…`);
  const text = await fetchText(source.url);
  if (text === null) {
    return { source, domains: [], status: "error" };
  }
  const domains = parseDomains(text, source.format, source.key, source.subkey, source.value_filter);
  logger.info(`  → ${domains.length.toLocaleString()} domains parsed from ${source.name}`);
  return { source, domains, status: "ok" };
}
