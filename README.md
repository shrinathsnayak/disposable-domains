# disposable-domains

<p align="center">
  <img src="cover.svg" alt="disposable-domains cover" width="100%"/>
</p>

**One unified blocklist of disposable email domains — merged from 31 community sources, deduplicated, and rebuilt every day.**

[🚀 Usage](#usage) · [📄 Output format](#output-format) · [🌐 Sources](#sources) · [🤝 Contributing](#contributing) · [🛠 Local dev](#local-development)

---

## 📊 Stats

<!-- STATS_START -->
| Metric | Value |
|--------|-------|
| Disposable Domains | 279,455 |
| Sources | 32 |
| Generated on | Fri, 29 May 2026 03:15:26 GMT |
<!-- STATS_END -->

---

## 🛡 Why this exists

Every disposable email blocklist has blind spots. This repo pulls from **31 community-maintained lists**, merges them into a single sorted `domains.json`, and pushes an update every day at 02:00 UTC — so you get broader coverage without managing multiple upstreams yourself.

---

## 🚀 Usage

Grab the raw file and check against it in any language:

```
https://cdn.jsdelivr.net/gh/shrinathsnayak/disposable-domains/domains.json
```

### TypeScript / JavaScript

```ts
const { domains } = await fetch(
  "https://cdn.jsdelivr.net/gh/shrinathsnayak/disposable-domains/domains.json",
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
  "https://cdn.jsdelivr.net/gh/shrinathsnayak/disposable-domains/domains.json"
) as res:
    data = json.load(res)

blocked = set(data["domains"])

def is_disposable(email: str) -> bool:
    parts = email.lower().rsplit("@", 1)
    return len(parts) == 2 and parts[1] in blocked
```

### 🔍 Inspect metadata with curl

```bash
curl -s https://cdn.jsdelivr.net/gh/shrinathsnayak/disposable-domains/domains.json \
  | jq '.meta'
```

---

## 📄 Output format

`domains.json` has two top-level keys — `meta` for auditing and `domains` for lookups:

```json
{
  "meta": {
    "generated_on": "2026-04-10T02:00:00.000Z",
    "total": 196394,
    "source_count": 31,
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

The `meta.sources` array records the per-source domain count and fetch status, making it easy to spot a broken upstream at a glance.

---

## ⚙️ How it works

Every day at **02:00 UTC**, the GitHub Actions workflow:

1. Fetches all 31 upstream blocklists **concurrently** (capped at 8 in-flight to avoid rate-limiting)
2. Merges domains into a `Set` as each source resolves — no waiting for the full batch
3. Merges any entries from `MANUAL_BLOCKED_DOMAINS` in [`blocked-sources.ts`](src/blocked-sources.ts) (trimmed, lowercased; invalid hostnames are skipped)
4. Filters out legitimate providers via `ALLOWED_DOMAINS` and optional allowlist sources (`ALLOWLIST_SOURCES` in [`allowed-sources.ts`](src/allowed-sources.ts)) — same `name` / `url` / `format` shape as blocklists
5. Writes a single sorted `domains.json` with full source stats
6. Commits the result **only if the content actually changed**

You can also trigger a manual run any time from the Actions tab via `workflow_dispatch`.

---

## 🌐 Sources

31 community lists, merged into one:

| Source                                                                                                                    | Format             |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| [disposable-email-domains/disposable-email-domains](https://github.com/disposable-email-domains/disposable-email-domains) | lines              |
| [disposable/disposable-email-domains (TXT)](https://disposable.github.io/disposable-email-domains/domains.txt)            | lines              |
| [disposable/disposable-email-domains (MX-verified)](https://disposable.github.io/disposable-email-domains/domains_mx.txt) | lines              |
| [ivolo/disposable-email-domains](https://github.com/ivolo/disposable-email-domains)                                       | json_array         |
| [wesbos/burner-email-providers](https://github.com/wesbos/burner-email-providers)                                         | lines              |
| [FGRibreau/mailchecker](https://github.com/FGRibreau/mailchecker)                                                         | lines              |
| [flotwig/disposable-email-addresses](https://github.com/flotwig/disposable-email-addresses)                               | lines              |
| [daisy1754/jp-disposable-emails](https://github.com/daisy1754/jp-disposable-emails)                                       | lines              |
| [unkn0w/disposable-email-domain-list](https://github.com/unkn0w/disposable-email-domain-list)                             | lines              |
| [amieiro/disposable-email-domains](https://github.com/amieiro/disposable-email-domains)                                   | lines              |
| [stopforumspam/toxic_domains](https://www.stopforumspam.com)                                                              | lines              |
| [MattKetmo/EmailChecker](https://github.com/MattKetmo/EmailChecker)                                                       | lines              |
| [adamloving/disposable-email-domains](https://gist.github.com/adamloving/4401361)                                         | lines              |
| [jamesonev/disposable-email-domains](https://gist.github.com/jamesonev/7e188c35fd5ca754c970e3a1caf045ef)                  | lines              |
| [elliotjreed/disposable-emails-filter-php](https://github.com/elliotjreed/disposable-emails-filter-php)                   | lines              |
| [disposable/static-disposable-lists (mail-data-hosts-net)](https://github.com/disposable/static-disposable-lists)         | lines              |
| [disposable/static-disposable-lists (manual)](https://github.com/disposable/static-disposable-lists)                      | lines              |
| [7c/fakefilter](https://github.com/7c/fakefilter)                                                                         | lines              |
| [7c/fakefilter (JSON v2)](https://github.com/7c/fakefilter/blob/main/json/data_version2.json)                             | json_fakefilter_v2 |
| [GeroldSetz/emailondeck.com-domains](https://github.com/GeroldSetz/emailondeck.com-domains)                               | lines              |
| [groundcat/disposable-email-domain-list](https://github.com/groundcat/disposable-email-domain-list)                       | lines              |
| [romainsimon/emailvalid](https://github.com/romainsimon/emailvalid)                                                       | json_object_keys   |
| [andreis/disposable-email-domains](https://github.com/andreis/disposable-email-domains)                                   | lines              |
| [TheDahoom/disposable-email](https://github.com/TheDahoom/disposable-email)                                               | lines              |
| [eser/sanitizer-svc](https://github.com/eser/sanitizer-svc)                                                               | lines              |
| [kslr/disposable-email-domains](https://github.com/kslr/disposable-email-domains)                                         | lines              |
| [sublime-security/static-files](https://github.com/sublime-security/static-files)                                         | lines              |
| [doodad-labs/disposable-email-domains](https://github.com/doodad-labs/disposable-email-domains)                           | lines              |
| [Propaganistas/Laravel-Disposable-Email](https://github.com/Propaganistas/Laravel-Disposable-Email)                       | json_array         |
| [DeviceAndBrowserInfo](https://deviceandbrowserinfo.com/) (disposable email API)                                          | json_array         |
| [infiniteloopltd/TempEmailDomainMXRecords](https://github.com/infiniteloopltd/TempEmailDomainMXRecords)                   | csv                |

---

## 🤝 Contributing

### ➕ Adding a source

1. Add an entry to `BLOCKED_SOURCES` in [`src/blocked-sources.ts`](src/blocked-sources.ts):

```ts
{
  name: "owner/repo-name",
  url: "https://raw.githubusercontent.com/owner/repo/main/domains.txt",
  format: "lines", // "lines" | "json_array" | "json_object" | "json_object_keys" | "csv" | "json_fakefilter_v2"
}
```

2. Supported formats:

| Format               | Description                                                                                       |
| -------------------- | ------------------------------------------------------------------------------------------------- |
| `lines`              | One domain per line — `#`, `//`, and `;` comment prefixes are stripped                            |
| `json_array`         | Top-level JSON array of domain strings                                                            |
| `json_object`        | JSON object with a named array of domains (use `key` / optional `subkey`)                         |
| `json_object_keys`   | JSON object where domain names are the keys                                                       |
| `csv`                | CSV with a header row; set `csv_domain_column` to the domain column name (default `domain`)       |
| `json_fakefilter_v2` | [7c/fakefilter](https://github.com/7c/fakefilter) `data_version2.json` (`domains` + `hosts` keys) |

3. Run `npm run generate` locally to confirm the source resolves correctly, then open a PR.

### ✅ Whitelisting a domain

To prevent a domain from ever appearing in the output, add it to `ALLOWED_DOMAINS` in [`src/allowed-sources.ts`](src/allowed-sources.ts):

```ts
export const ALLOWED_DOMAINS: string[] = ["example.com"];
```

This is merged with domains from every entry in `ALLOWLIST_SOURCES` at generation time (each uses the same formats as blocklists).

To pull an allowlist from upstream with a non-text format, add objects to `ALLOWLIST_SOURCES` in the same way as blocklist entries (see **Adding a source** above).

### ➕ Manually blocking domains

To always include domains in the output blocklist (for example a new disposable host not yet on upstream lists), add them to `MANUAL_BLOCKED_DOMAINS` in [`src/blocked-sources.ts`](src/blocked-sources.ts):

```ts
export const MANUAL_BLOCKED_DOMAINS: string[] = ["new-temp-host.example"];
```

They are merged after all upstream blocklists. If a domain is also listed in `ALLOWED_DOMAINS` or returned by `ALLOWLIST_SOURCES`, it is still removed from the final output.

---

## 📁 Project structure

```
disposable-domains/
├── src/
│   ├── blocked-sources.ts   `BLOCKED_SOURCES` + optional `MANUAL_BLOCKED_DOMAINS`
│   ├── allowed-sources.ts   optional `ALLOWLIST_SOURCES` + `ALLOWED_DOMAINS`
│   ├── constants.ts         output path, concurrency limit, domain regex
│   ├── logger.ts            winston logger (timestamp + colorized level)
│   ├── types.ts             TypeScript interfaces (Source, SourceStat)
│   ├── utils.ts             fetch, parse, and concurrency helpers
│   └── generate.ts          orchestration entry point
├── test/
│   └── utils.test.ts        unit tests for parse helpers
├── .github/workflows/
│   ├── generate.yml         daily cron — regenerates and commits domains.json
│   └── test.yml             runs on every PR
├── domains.json
└── README.md
```

---

## 🛠 Local development

Requires **Node 22+**.

```bash
npm install

npm run generate   # regenerate domains.json
npm test           # run unit tests
npm run build      # compile to dist/
```

---

## 📜 License

MIT — see [LICENSE](LICENSE).

---

Project by [Shrinath Nayak](https://snayak.dev)
