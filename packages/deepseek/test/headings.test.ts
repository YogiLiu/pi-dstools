import { describe, expect, it } from "vitest";

import { extractHeadings, formatHeadingTable } from "../src/index";

function extractsOriginalAtxHeadingText() {
  const content = [
    "# **Top** [guide](https://example.com) ###",
    "   ## C# | `setup` ###",
    "###### Deep",
    "####### Too many",
    "#NoSpace",
    "    # Indented code",
    "#### ",
    "## A\u0001B",
  ].join("\n");
  const entries = extractHeadings(content);
  expect(entries).toEqual([
    { line: 1, level: 1, text: "**Top** [guide](https://example.com)" },
    { line: 2, level: 2, text: "C# \\| `setup`" },
    { line: 3, level: 6, text: "Deep" },
    { line: 8, level: 2, text: "A B" },
  ]);
  expect(formatHeadingTable(entries)).toBe(
    [
      "| Line | Level | Heading |",
      "| --- | --- | --- |",
      "| L1 | H1 | **Top** [guide](https://example.com) |",
      "| L2 | H2 | C# \\| `setup` |",
      "| L3 | H6 | Deep |",
      "| L8 | H2 | A B |",
    ].join("\n"),
  );
  expect(formatHeadingTable([])).toBe(
    ["| Line | Level | Heading |", "| --- | --- | --- |"].join("\n"),
  );
}

function truncatesLongHeadingText() {
  const entries = extractHeadings(`## ${"A".repeat(81)}`);
  expect(entries[0]?.text).toBe(`${"A".repeat(80)}...`);
}

function skipsFencedCodeAndHandlesMixedLineEndings() {
  const content =
    [
      "# Top",
      "```md",
      "# Hidden",
      "~~~",
      "```",
      "## After",
      "~~~~js",
      "### Hidden",
      "   ~~~~   ",
      "# Tail",
    ].join("\r\n") + "\r";
  expect(extractHeadings(content)).toEqual([
    { line: 1, level: 1, text: "Top" },
    { line: 6, level: 2, text: "After" },
    { line: 10, level: 1, text: "Tail" },
  ]);
}

function respectsFenceLengthAndSkipsUnclosedFences() {
  const content = [
    "# Top",
    "````md",
    "# Hidden",
    "```",
    "## Still hidden",
    "````   ",
    "## After",
    "~~~",
    "# Hidden forever",
  ].join("\n");
  expect(extractHeadings(content)).toEqual([
    { line: 1, level: 1, text: "Top" },
    { line: 7, level: 2, text: "After" },
  ]);
}

describe("Markdown heading table", () => {
  it("extracts original ATX heading text and formats a table", extractsOriginalAtxHeadingText);
  it("truncates long heading text", truncatesLongHeadingText);
  it("skips fenced code and handles mixed line endings", skipsFencedCodeAndHandlesMixedLineEndings);
  it("respects fence length and skips unclosed fences", respectsFenceLengthAndSkipsUnclosedFences);
});
