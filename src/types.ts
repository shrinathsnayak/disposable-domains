export interface Source {
  name: string;
  url: string;
  format: "lines" | "json_array";
}

export interface SourceStat {
  name: string;
  url: string;
  /** Number of domains parsed from the source before allowlist filtering. */
  raw_count: number;
  status: "ok" | "error";
}
