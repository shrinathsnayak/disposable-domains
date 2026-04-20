export interface Source {
  name: string;
  url: string;
  format:
    | "lines"
    | "json_array"
    | "json_object"
    | "json_object_keys"
    | "csv"
    | "json_fakefilter_v2";
  /** For json_object: the key in the top-level object that holds the domain array. */
  key?: string;
  /** For json_object: if array elements are objects, the key within each element that holds the domain string. */
  subkey?: string;
  /** For json_object_keys: only include domains whose value strictly equals this string. */
  value_filter?: string;
  /** For csv: header name of the column containing the domain (default `"domain"`). */
  csv_domain_column?: string;
}

export interface SourceStat {
  name: string;
  url: string;
  /** Number of domains parsed from the source before allowlist filtering. */
  raw_count: number;
  status: "ok" | "error";
}
