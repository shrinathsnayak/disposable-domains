# disposable-domains

A single, always-current list of **disposable email domains** - aggregated from 12 community sources, deduplicated, and published as `domains.json` every day.

---

## How it works

Every day at **02:00 UTC**, a GitHub Actions workflow:

1. Fetches all 12 upstream blocklists **in parallel**
2. Merges and **deduplicates** across all sources using a `Set`
3. Filters out legitimate providers via an **allowlist** (so real domains are never blocked)
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
    "source_count": 12,
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

---

## Adding a source

1. Add an entry to `SOURCES` in [src/sources.ts](src/sources.ts):

```ts
{
  name: "owner/repo-name",
  url: "https://raw.githubusercontent.com/owner/repo/main/domains.txt",
  format: "lines", // or "json_array"
}
```

2. Supported formats:
   - `"lines"` - one domain per line; `#`, `//`, and `;` comment prefixes are stripped
   - `"json_array"` - top-level JSON array of domain strings

3. Run `npm run generate` locally to verify the source resolves correctly.

---

## Project structure

```
disposable-domains/
├── src/
│   ├── constants.ts   - output path, user-agent, timeout, domain regex
│   ├── sources.ts     - upstream source list
│   ├── types.ts       - TypeScript interfaces (Source, SourceStat)
│   ├── utils.ts       - fetch and parse helpers
│   └── generate.ts    - orchestration entry point
├── test/
│   └── utils.test.ts  - unit tests for parse helpers
├── .github/workflows/
│   ├── generate.yml   - daily cron: regenerates and commits domains.json
│   └── test.yml       - runs on every PR
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
- **Multi-source**: 12 community lists merged into one, so gaps in one source are covered by others
- **Deduplicated**: A single `Set` pass ensures no domain appears twice
- **Allowlisted**: Legitimate providers are never accidentally blocked
- **Auditable**: The `meta` block in `domains.json` shows exactly where every domain came from

---

## Future

Additional capabilities that may be added:

- npm package for direct import
- REST API for real-time lookups
- Webhook notifications on significant list changes
- Per-source diff tracking

---

## License

MIT - see [LICENSE](LICENSE).
