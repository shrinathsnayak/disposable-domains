import type { Source } from "./types";
export type { Source, SourceStat } from "./types";

export const SOURCES: Source[] = [
  {
    name: "disposable-email-domains/disposable-email-domains",
    url: "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/disposable_email_blocklist.conf",
    format: "lines",
  },
  {
    name: "disposable/disposable-email-domains (TXT)",
    url: "https://disposable.github.io/disposable-email-domains/domains.txt",
    format: "lines",
  },
  {
    name: "disposable/disposable-email-domains (MX-verified)",
    url: "https://disposable.github.io/disposable-email-domains/domains_mx.txt",
    format: "lines",
  },
  {
    name: "ivolo/disposable-email-domains",
    url: "https://raw.githubusercontent.com/ivolo/disposable-email-domains/master/index.json",
    format: "json_array",
  },
  {
    name: "wesbos/burner-email-providers",
    url: "https://raw.githubusercontent.com/wesbos/burner-email-providers/master/emails.txt",
    format: "lines",
  },
  {
    name: "FGRibreau/mailchecker",
    url: "https://raw.githubusercontent.com/FGRibreau/mailchecker/master/list.txt",
    format: "lines",
  },
  {
    name: "flotwig/disposable-email-addresses",
    url: "https://raw.githubusercontent.com/flotwig/disposable-email-addresses/master/domains.txt",
    format: "lines",
  },
  {
    name: "daisy1754/jp-disposable-emails",
    url: "https://raw.githubusercontent.com/daisy1754/jp-disposable-emails/master/list.txt",
    format: "lines",
  },
  {
    name: "unkn0w/disposable-email-domain-list",
    url: "https://raw.githubusercontent.com/unkn0w/disposable-email-domain-list/main/domains.txt",
    format: "lines",
  },
  {
    name: "amieiro/disposable-email-domains",
    url: "https://raw.githubusercontent.com/amieiro/disposable-email-domains/master/denyDomains.txt",
    format: "lines",
  },
  {
    name: "stopforumspam/toxic_domains",
    url: "https://www.stopforumspam.com/downloads/toxic_domains_whole.txt",
    format: "lines",
  },
  {
    name: "MattKetmo/EmailChecker",
    url: "https://raw.githubusercontent.com/MattKetmo/EmailChecker/master/res/throwaway_domains.txt",
    format: "lines",
  },
  {
    name: "adamloving/disposable-email-domains",
    url: "https://gist.githubusercontent.com/adamloving/4401361/raw/",
    format: "lines",
  },
  {
    name: "jamesonev/disposable-email-domains",
    url: "https://gist.githubusercontent.com/jamesonev/7e188c35fd5ca754c970e3a1caf045ef/raw/",
    format: "lines",
  },
  {
    name: "disposable/static-disposable-lists (mail-data-hosts-net)",
    url: "https://raw.githubusercontent.com/disposable/static-disposable-lists/master/mail-data-hosts-net.txt",
    format: "lines",
  },
  {
    name: "disposable/static-disposable-lists (manual)",
    url: "https://raw.githubusercontent.com/disposable/static-disposable-lists/master/manual.txt",
    format: "lines",
  },
  {
    name: "7c/fakefilter",
    url: "https://raw.githubusercontent.com/7c/fakefilter/main/txt/data.txt",
    format: "lines",
  },
  {
    name: "GeroldSetz/emailondeck.com-domains",
    url: "https://raw.githubusercontent.com/GeroldSetz/emailondeck.com-domains/refs/heads/master/emailondeck.com_domains_from_bdea.cc.txt",
    format: "lines",
  },
  {
    name: "groundcat/disposable-email-domain-list",
    url: "https://raw.githubusercontent.com/groundcat/disposable-email-domain-list/master/domains.txt",
    format: "lines",
  },
  {
    name: "romainsimon/emailvalid",
    url: "https://raw.githubusercontent.com/romainsimon/emailvalid/refs/heads/master/domains.json",
    format: "json_object_keys",
    value_filter: "disposable",
  },
];

export const ALLOWLIST_URL =
  "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/main/allowlist.conf";
