// Remote allowlist — domains mistakenly flagged as disposable by upstream sources.
// Fetched at generation time and merged with ALLOWED_DOMAINS below.
export const ALLOWLIST_URL =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/allowlist.conf";

// Add any domains you want to whitelist here.
// These will never appear in the generated blocked list regardless of upstream sources.
export const ALLOWED_DOMAINS: string[] = [];
