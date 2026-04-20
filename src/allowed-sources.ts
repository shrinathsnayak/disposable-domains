import type { Source } from "./types";

/**
 * Optional upstream allowlists — same object shape as `BLOCKED_SOURCES` in `blocked-sources.ts`
 * (`name`, `url`, `format`, plus format-specific fields). Parsed with the same rules as blocklists.
 */
export const ALLOWLIST_SOURCES: Source[] = [];

// Domains to whitelist here; merged with remote allowlists above at generation time.
export const ALLOWED_DOMAINS: string[] = [];
