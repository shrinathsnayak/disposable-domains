import type { Source } from "./types";
import { USER_AGENT, FETCH_TIMEOUT_MS, DOMAIN_RE } from "./constants";

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
 *
 * @example
 * const text = await fetchText("https://example.com/domains.txt");
 * if (text === null) console.warn("fetch failed");
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
    console.error(`  ✗ ${url}: ${message}`);
    return null;
  }
}

/**
 * Parses a newline-delimited plain-text domain list.
 *
 * Each line is trimmed and lowercased. Lines that are empty or begin with a
 * comment marker (`#`, `//`, `;`) are dropped. Leading `@` prefixes and
 * trailing dots (common in DNS zone-file style lists) are stripped. Only
 * lines that match {@link DOMAIN_RE} are kept, ensuring the result contains
 * valid domain names.
 *
 * @param text - Raw file content of a plain-text domain list.
 * @returns Array of normalised, validated domain strings.
 *
 * @example
 * const domains = parseLines("# comment\nexample.com\n@mail.org.\n");
 * // → ["example.com", "mail.org"]
 */
export function parseLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim().toLowerCase())
    .filter((line) => line && !line.startsWith("#") && !line.startsWith("//") && !line.startsWith(";"))
    .map((line) => line.replace(/^@/, "").replace(/\.$/, ""))
    .filter((line) => DOMAIN_RE.test(line));
}

/**
 * Parses a JSON array of domain strings.
 *
 * Expects the top-level JSON value to be an array. Non-string elements are
 * silently ignored. Each string is trimmed, lowercased, and validated against
 * {@link DOMAIN_RE}. If the JSON is malformed or the top-level value is not
 * an array, an error is logged and an empty array is returned.
 *
 * @param text - Raw JSON file content.
 * @returns Array of normalised, validated domain strings.
 *
 * @example
 * const domains = parseJsonArray('["Example.COM", "  mail.org  ", 42]');
 * // → ["example.com", "mail.org"]
 */
export function parseJsonArray(text: string): string[] {
  try {
    const data: unknown = JSON.parse(text);
    if (Array.isArray(data)) {
      return data
        .filter((d): d is string => typeof d === "string")
        .map((d) => d.trim().toLowerCase())
        .filter((d) => DOMAIN_RE.test(d));
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ JSON parse error: ${message}`);
  }
  return [];
}

/**
 * Dispatches raw text to the correct parser based on the source format.
 *
 * Acts as a router between {@link parseLines} and {@link parseJsonArray}.
 * If an unknown format is passed the function returns an empty array rather
 * than throwing, keeping the aggregation pipeline fault-tolerant.
 *
 * @param text   - Raw file content to parse.
 * @param format - The expected format of the content (`"lines"` or `"json_array"`).
 * @returns Array of normalised, validated domain strings.
 */
export function parseDomains(text: string, format: Source["format"]): string[] {
  if (format === "lines") return parseLines(text);
  if (format === "json_array") return parseJsonArray(text);
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
 *
 * @example
 * const result = await fetchSource(SOURCES[0]);
 * console.log(result.status, result.domains.length);
 */
export async function fetchSource(
  source: Source
): Promise<{ source: Source; domains: string[]; status: "ok" | "error" }> {
  console.log(`Fetching ${source.name}…`);
  const text = await fetchText(source.url);
  if (text === null) {
    return { source, domains: [], status: "error" };
  }
  const domains = parseDomains(text, source.format);
  console.log(`  → ${domains.length.toLocaleString()} parsed`);
  return { source, domains, status: "ok" };
}
