# disposable-domains

A single, always-current list of **disposable email domains** - aggregated from 25 community sources, deduplicated, and published as `domains.json` every day.

---

## How it works

Every day at **02:00 UTC**, a GitHub Actions workflow:

1. Fetches all 25 upstream blocklists **concurrently** (capped at 8 in-flight to avoid rate-limiting)
2. Merges domains into a `Set` **as each source resolves** — no waiting for the full batch
3. Filters out legitimate providers via a remote **allowlist** and any entries in `ALLOWED_DOMAINS`
4. Writes a single sorted `domains.json` with stats and a flat domain array
5. Commits the result only **if the content actually changed**

You can also trigger a manual regeneration any time via `workflow_dispatch`.

---

## Output format

```json
{
  "meta": {
    "generated_at": "2026-04-10T02:00:00.000Z",
    "total": 196394,
    "source_count": 25,
    "sources": [
      {
        "name": "ivolo/disposable-email-domains",
        "url": "...",
        "raw_count": 121557,
        "status": "ok"
      }
    ]
  },
  "domains": ["0-180.com", "0-30.com", "..."]
}
```

The `meta` block tells you exactly when the file was generated, how many domains it contains, and the per-source breakdown - useful for debugging or auditing.

---

## Usage

### JavaScript / TypeScript

```ts
const { domains } = await fetch(
  "https://raw.githubusercontent.com/shrinathsnayak/disposable-domains/main/domains.json"
).then((r) => r.json());

const blocked = new Set<string>(domains);

function isDisposable(email: string): boolean {
  return blocked.has(email.split("@")[1]?.toLowerCase() ?? "");
}
```

### Python

```python
import urllib.request, json

with urllib.request.urlopen(
    "https://raw.githubusercontent.com/shrinathsnayak/disposable-domains/main/domains.json"
) as res:
    data = json.load(res)

blocked = set(data["domains"])

def is_disposable(email: str) -> bool:
    parts = email.lower().rsplit("@", 1)
    return len(parts) == 2 and parts[1] in blocked
```

### curl - inspect metadata

```bash
curl -s https://raw.githubusercontent.com/shrinathsnayak/disposable-domains/main/domains.json \
  | jq '.meta'
```

---

## Sources

| Source | Format |
|--------|--------|
| [disposable-email-domains/disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains) | lines |
| [disposable/disposable-email-domains (TXT)](https://disposable.github.io/disposable-email-domains/domains.txt) | lines |
| [disposable/disposable-email-domains (MX-verified)](https://disposable.github.io/disposable-email-domains/domains_mx.txt) | lines |
| [ivolo/disposable-email-domains](https://github.com/ivolo/disposable-email-domains) | JSON array |
| [wesbos/burner-email-providers](https://github.com/wesbos/burner-email-providers) | lines |
| [FGRibreau/mailchecker](https://github.com/FGRibreau/mailchecker) | lines |
| [flotwig/disposable-email-addresses](https://github.com/flotwig/disposable-email-addresses) | lines |
| [daisy1754/jp-disposable-emails](https://github.com/daisy1754/jp-disposable-emails) | lines |
| [unkn0w/disposable-email-domain-list](https://github.com/unkn0w/disposable-email-domain-list) | lines |
| [amieiro/disposable-email-domains](https://github.com/amieiro/disposable-email-domains) | lines |
| [stopforumspam/toxic_domains](https://www.stopforumspam.com) | lines |
| [MattKetmo/EmailChecker](https://github.com/MattKetmo/EmailChecker) | lines |
| [adamloving/disposable-email-domains](https://gist.github.com/adamloving/4401361) | lines |
| [jamesonev/disposable-email-domains](https://gist.github.com/jamesonev/7e188c35fd5ca754c970e3a1caf045ef) | lines |
| [disposable/static-disposable-lists (mail-data-hosts-net)](https://github.com/disposable/static-disposable-lists) | lines |
| [disposable/static-disposable-lists (manual)](https://github.com/disposable/static-disposable-lists) | lines |
| [7c/fakefilter](https://github.com/7c/fakefilter) | lines |
| [GeroldSetz/emailondeck.com-domains](https://github.com/GeroldSetz/emailondeck.com-domains) | lines |
| [groundcat/disposable-email-domain-list](https://github.com/groundcat/disposable-email-domain-list) | lines |
| [romainsimon/emailvalid](https://github.com/romainsimon/emailvalid) | JSON object keys |
| [andreis/disposable-email-domains](https://github.com/andreis/disposable-email-domains) | lines |
| [TheDahoom/disposable-email](https://github.com/TheDahoom/disposable-email) | lines |
| [eser/sanitizer-svc](https://github.com/eser/sanitizer-svc) | lines |
| [kslr/disposable-email-domains](https://github.com/kslr/disposable-email-domains) | lines |
| [sublime-security/static-files](https://github.com/sublime-security/static-files) | lines |

---

## Adding a blocked source

1. Add an entry to `BLOCKED_SOURCES` in [src/blocked-sources.ts](src/blocked-sources.ts):

```ts
{
  name: "owner/repo-name",
  url: "https://raw.githubusercontent.com/owner/repo/main/domains.txt",
  format: "lines", // or "json_array" / "json_object_keys"
}
```

2. Supported formats:
   - `"lines"` — one domain per line; `#`, `//`, and `;` comment prefixes are stripped
   - `"json_array"` — top-level JSON array of domain strings
   - `"json_object_keys"` — JSON object where domain names are keys (optionally filter by value)

3. Run `npm run generate` locally to verify the source resolves correctly.

## Whitelisting a domain

To prevent a domain from ever appearing in the blocked list, add it to `ALLOWED_DOMAINS` in [src/allowed-sources.ts](src/allowed-sources.ts):

```ts
export const ALLOWED_DOMAINS: string[] = [
  "example.com",
];
```

This is merged with the remote allowlist at generation time.

---

## Project structure

```
disposable-domains/
├── src/
│   ├── blocked-sources.ts  - upstream blocklist sources (25 entries)
│   ├── allowed-sources.ts  - remote allowlist URL + user-defined ALLOWED_DOMAINS
│   ├── constants.ts        - output path, user-agent, timeout, concurrency limit, domain regex
│   ├── logger.ts           - winston logger (timestamp + colorized level)
│   ├── types.ts            - TypeScript interfaces (Source, SourceStat)
│   ├── utils.ts            - fetch, parse, and concurrency helpers
│   └── generate.ts         - orchestration entry point
├── test/
│   └── utils.test.ts       - unit tests for parse helpers
├── .github/workflows/
│   ├── generate.yml        - daily cron: regenerates and commits domains.json
│   └── test.yml            - runs on every PR
├── domains.json
└── README.md
```

---

## Local development

```bash
npm install

# regenerate domains.json
npm run generate

# run tests
npm test

# compile to dist/
npm run build
```

Requires Node **22+**.

---

## Key features

- **Always fresh**: Regenerated daily via GitHub Actions - no manual updates needed
- **Multi-source**: 25 community lists merged into one, so gaps in one source are covered by others
- **Deduplicated**: A single `Set` pass ensures no domain appears twice
- **Allowlisted**: Legitimate providers are never accidentally blocked — extend via `ALLOWED_DOMAINS`
- **Concurrent**: Sources are fetched with a concurrency cap to avoid rate-limiting
- **Auditable**: The `meta` block in `domains.json` shows exactly where every domain came from

---

## License

MIT - see [LICENSE](LICENSE).
