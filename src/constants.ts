export const OUTPUT_FILE = "domains.json";
export const USER_AGENT = "disposable-domain-aggregator/1.0";
export const FETCH_TIMEOUT_MS = 30_000;
export const DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/;