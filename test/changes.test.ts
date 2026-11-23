import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  diffDomains,
  findSuspiciousChanges,
  prependEntry,
  readSummaries,
  renderEntry,
  renderPreview,
  replaceSection,
  type ChangeSummary,
} from "../src/changes.js";

const summary = (date: string, added = 1, removed = 0, total = 10): ChangeSummary => ({
  date,
  added,
  removed,
  total,
});

describe("diffDomains", () => {
  it("returns added and removed domains in input order", () => {
    assert.deepEqual(diffDomains(["a.com", "b.com", "c.com"], ["b.com", "c.com", "d.com"]), {
      added: ["d.com"],
      removed: ["a.com"],
    });
  });

  it("returns empty lists when nothing changed", () => {
    assert.deepEqual(diffDomains(["a.com"], ["a.com"]), { added: [], removed: [] });
  });
});

describe("renderEntry", () => {
  it("embeds a parseable summary and shows only the net counts", () => {
    const entry = renderEntry(summary("2026-11-24 02:00 UTC", 2, 1));
    assert.deepEqual(readSummaries(entry), [summary("2026-11-24 02:00 UTC", 2, 1)]);
    assert.match(entry, /\*\*\+2 added · −1 removed\*\* · 10 total/);
    assert.ok(!entry.includes("| Source"));
  });
});

describe("prependEntry", () => {
  it("puts the new entry first and keeps only the newest entries", () => {
    let doc: string | null = null;
    for (const date of ["d1", "d2", "d3"]) {
      doc = prependEntry(doc, renderEntry(summary(date)), 2);
    }
    assert.deepEqual(
      readSummaries(doc!).map((s) => s.date),
      ["d3", "d2"],
    );
  });

  it("drops the placeholder text of a report with no entries", () => {
    const doc = prependEntry(
      "# Report\n\nNo changes recorded yet.\n",
      renderEntry(summary("d")),
      30,
    );
    assert.ok(!doc.includes("No changes recorded yet."));
    assert.equal(readSummaries(doc).length, 1);
  });
});

describe("renderPreview", () => {
  it("renders a row per run and a link, without domain names", () => {
    const preview = renderPreview([summary("d2", 5, 1, 20), summary("d1")], "CHANGES.md");
    assert.match(preview, /\| d2 \| \+5 \| −1 \| 20 \|/);
    assert.match(preview, /\| d1 \| \+1 \| 0 \| 10 \|/);
    assert.match(preview, /\(CHANGES\.md\)/);
    assert.ok(!preview.includes("`"));
  });
});

describe("replaceSection", () => {
  it("replaces only the marked section", () => {
    const text = "top\n<!-- X_START -->\nold\n<!-- X_END -->\nbottom";
    assert.equal(
      replaceSection(text, "X", "new"),
      "top\n<!-- X_START -->\nnew\n<!-- X_END -->\nbottom",
    );
  });

  it("throws when markers are missing", () => {
    assert.throws(() => replaceSection("no markers", "X", "new"), /X_START/);
  });
});

describe("findSuspiciousChanges", () => {
  const limits = { maxTotalDrop: 0.05, maxSourceGrowth: 0.5, minSourceGrowthCount: 1000 };
  const src = (name: string, raw_count: number, status: "ok" | "error" = "ok") => ({
    name,
    url: "",
    raw_count,
    status,
  });

  it("accepts normal daily churn", () => {
    const prev = { total: 300_000, sources: [src("a", 100_000)] };
    const next = { total: 299_000, sources: [src("a", 100_400)] };
    assert.deepEqual(findSuspiciousChanges(prev, next, limits), []);
  });

  it("flags a sharp drop in the total", () => {
    const prev = { total: 300_000, sources: [] };
    const next = { total: 200_000, sources: [] };
    assert.match(
      findSuspiciousChanges(prev, next, limits)[0],
      /Total fell from 300,000 to 200,000/,
    );
  });

  it("flags a source that grows sharply by a meaningful amount", () => {
    const prev = { total: 300_000, sources: [src("big", 10_000), src("tiny", 100)] };
    const next = { total: 320_000, sources: [src("big", 30_000), src("tiny", 400)] };
    const problems = findSuspiciousChanges(prev, next, limits);
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^big grew from 10,000 to 30,000/);
  });

  it("ignores new sources and sources recovering from a failed fetch", () => {
    const prev = { total: 300_000, sources: [src("recovering", 0, "error")] };
    const next = {
      total: 400_000,
      sources: [src("recovering", 50_000), src("brand-new", 90_000)],
    };
    assert.deepEqual(findSuspiciousChanges(prev, next, limits), []);
  });
});
