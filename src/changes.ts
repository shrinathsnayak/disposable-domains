import type { SourceStat } from "./types";

/** Machine-readable header of one report entry, embedded in its marker comment. */
export interface ChangeSummary {
  date: string;
  added: number;
  removed: number;
  total: number;
}

const ENTRY_MARKER_RE = /^<!-- entry (\{.*\}) -->$/gm;

const CHANGES_HEADER = `# 📰 Daily change report

What changed in the blocklist on each run, newest first. Only runs that changed the list are recorded, and the last 30 are kept; older changes, and the exact domains added or removed, are in the git history of \`domains.txt\`.
`;

/** Domains present only in `next` (`added`) and only in `prev` (`removed`), in input order. */
export function diffDomains(
  prev: readonly string[],
  next: readonly string[],
): { added: string[]; removed: string[] } {
  const prevSet = new Set(prev);
  const nextSet = new Set(next);
  return {
    added: next.filter((d) => !prevSet.has(d)),
    removed: prev.filter((d) => !nextSet.has(d)),
  };
}

const fmt = (n: number): string => n.toLocaleString("en-US");
const signed = (n: number): string => (n > 0 ? `+${fmt(n)}` : n < 0 ? `−${fmt(-n)}` : "0");

export interface ChangeLimits {
  /** Largest allowed drop in the total, as a fraction of the previous total. */
  maxTotalDrop: number;
  /** Largest allowed growth of one source, as a fraction of its previous count… */
  maxSourceGrowth: number;
  /** …ignored unless the source also gained at least this many domains. */
  minSourceGrowthCount: number;
}

type RunMeta = { total: number; sources: readonly SourceStat[] };

/**
 * Reasons the new output looks like a broken or poisoned upstream rather than
 * normal daily churn. Empty when the change is within `limits`. New sources and
 * sources recovering from a failed fetch are not counted as growth.
 */
export function findSuspiciousChanges(
  prev: RunMeta,
  next: RunMeta,
  limits: ChangeLimits,
): string[] {
  const problems: string[] = [];
  const pct = (r: number): string => `${(r * 100).toFixed(1)}%`;

  const drop = prev.total > 0 ? (prev.total - next.total) / prev.total : 0;
  if (drop > limits.maxTotalDrop) {
    problems.push(
      `Total fell from ${fmt(prev.total)} to ${fmt(next.total)} (−${pct(drop)}, limit ${pct(limits.maxTotalDrop)})`,
    );
  }

  const before = new Map(prev.sources.map((s) => [s.name, s]));
  for (const s of next.sources) {
    const p = before.get(s.name);
    if (!p || p.status !== "ok" || p.raw_count === 0 || s.status !== "ok") continue;
    const gained = s.raw_count - p.raw_count;
    const growth = gained / p.raw_count;
    if (gained >= limits.minSourceGrowthCount && growth > limits.maxSourceGrowth) {
      problems.push(
        `${s.name} grew from ${fmt(p.raw_count)} to ${fmt(s.raw_count)} (+${pct(growth)}, limit ${pct(limits.maxSourceGrowth)})`,
      );
    }
  }
  return problems;
}

/** Renders one report entry: how many domains the published list gained and lost. */
export function renderEntry(summary: ChangeSummary): string {
  return [
    `<!-- entry ${JSON.stringify(summary)} -->`,
    `## ${summary.date}`,
    "",
    `**${signed(summary.added)} added · ${signed(-summary.removed)} removed** · ${fmt(summary.total)} total`,
    "",
  ].join("\n");
}

/** Splits a report into its entries (each starting with its marker). */
function splitEntries(doc: string): string[] {
  const starts = [...doc.matchAll(ENTRY_MARKER_RE)].map((m) => m.index);
  return starts.map((start, i) => doc.slice(start, starts[i + 1]).trimEnd() + "\n");
}

/** Adds `entry` to the top of the report `doc` (or a new one) and keeps the newest `keep` entries. */
export function prependEntry(doc: string | null, entry: string, keep: number): string {
  const entries = [entry.trimEnd() + "\n", ...splitEntries(doc ?? "")].slice(0, keep);
  return `${CHANGES_HEADER}\n${entries.join("\n")}`;
}

/** Reads the summaries of all entries in a report, newest first. */
export function readSummaries(doc: string): ChangeSummary[] {
  return [...doc.matchAll(ENTRY_MARKER_RE)].map((m) => JSON.parse(m[1]) as ChangeSummary);
}

/** README preview: the latest runs as a table, with a link to the full report. */
export function renderPreview(summaries: readonly ChangeSummary[], reportPath: string): string {
  const rows = summaries.map(
    (s) => `| ${s.date} | ${signed(s.added)} | ${signed(-s.removed)} | ${fmt(s.total)} |`,
  );
  return [
    "| Run | Added | Removed | Total |",
    "| --- | ---: | ---: | ---: |",
    ...rows,
    "",
    `[See the full change report →](${reportPath})`,
  ].join("\n");
}

/** Replaces the content between `<!-- NAME_START -->` and `<!-- NAME_END -->` in `text`. */
export function replaceSection(text: string, name: string, content: string): string {
  const start = `<!-- ${name}_START -->`;
  const end = `<!-- ${name}_END -->`;
  const startIdx = text.indexOf(start);
  const endIdx = text.indexOf(end);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(`Could not find ${start} / ${end} markers`);
  }
  return text.slice(0, startIdx + start.length) + "\n" + content + "\n" + text.slice(endIdx);
}
