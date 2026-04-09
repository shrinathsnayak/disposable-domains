import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseLines, parseJsonArray, parseDomains } from "../src/utils.js";

describe("parseLines", () => {
  it("parses valid domains", () => {
    assert.deepEqual(parseLines("example.com\nmail.org\n"), ["example.com", "mail.org"]);
  });

  it("strips comment lines starting with #, //, ;", () => {
    const input = "# comment\n// also comment\n; semicolon\nexample.com";
    assert.deepEqual(parseLines(input), ["example.com"]);
  });

  it("strips leading @ and trailing dot", () => {
    assert.deepEqual(parseLines("@example.com\nmail.org."), ["example.com", "mail.org"]);
  });

  it("lowercases and trims whitespace", () => {
    assert.deepEqual(parseLines("  EXAMPLE.COM  \n  Mail.Org  "), ["example.com", "mail.org"]);
  });

  it("drops empty lines", () => {
    assert.deepEqual(parseLines("\n\nexample.com\n\n"), ["example.com"]);
  });

  it("drops invalid domains", () => {
    assert.deepEqual(parseLines("not a domain\nexample.com\n-bad.com\n.bad.com"), ["example.com"]);
  });

  it("handles Windows line endings (CRLF)", () => {
    assert.deepEqual(parseLines("example.com\r\nmail.org\r\n"), ["example.com", "mail.org"]);
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(parseLines(""), []);
  });
});

describe("parseJsonArray", () => {
  it("parses a JSON array of domains", () => {
    assert.deepEqual(parseJsonArray('["example.com","mail.org"]'), ["example.com", "mail.org"]);
  });

  it("lowercases and trims entries", () => {
    assert.deepEqual(parseJsonArray('["  EXAMPLE.COM  "]'), ["example.com"]);
  });

  it("silently ignores non-string elements", () => {
    assert.deepEqual(parseJsonArray('["example.com", 42, null, true]'), ["example.com"]);
  });

  it("drops invalid domains", () => {
    assert.deepEqual(parseJsonArray('["example.com", "not valid", "-bad.com"]'), ["example.com"]);
  });

  it("returns empty array for malformed JSON", () => {
    assert.deepEqual(parseJsonArray("not json"), []);
  });

  it("returns empty array when top-level value is not an array", () => {
    assert.deepEqual(parseJsonArray('{"key":"value"}'), []);
  });

  it("returns empty array for empty input", () => {
    assert.deepEqual(parseJsonArray(""), []);
  });
});

describe("parseDomains", () => {
  it("routes lines format to parseLines", () => {
    assert.deepEqual(parseDomains("example.com\n# comment", "lines"), ["example.com"]);
  });

  it("routes json_array format to parseJsonArray", () => {
    assert.deepEqual(parseDomains('["example.com"]', "json_array"), ["example.com"]);
  });

  it("throws on unknown format", () => {
    assert.throws(
      () => parseDomains("anything", "unknown" as never),
      /Unknown format/,
    );
  });
});
