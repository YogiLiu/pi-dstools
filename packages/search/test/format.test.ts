import { describe, expect, it } from "vitest";

import {
  authorityLabel,
  formatResultsForModel,
  formatResultsForTui,
  qualityLabel,
} from "../src/format";
import { createErrorDetails } from "../src/output";
import { makeRecord } from "./helpers";

function computesQualityAndAuthorityThresholds() {
  expect(qualityLabel(1.5)).toBe("high");
  expect(qualityLabel(1.49)).toBe("low");
  expect(authorityLabel(3)).toBe("high");
  expect(authorityLabel(2)).toBe("low");
}

function rendersModelFormatWithUnknownMetadata() {
  const record = {
    index: 1,
    title: "A title",
    siteName: null,
    url: "https://example.com/a",
    date: null,
    snippet: "Snippet",
    summary: "Summary",
    quality: "high" as const,
    authority: "low" as const,
    pageContentPath: "/tmp/pi-dstools/search/uuid/1.md",
    pageContentLines: 428,
  };
  expect(formatResultsForModel([record])).toBe(
    [
      "1. A title",
      "Site: unknown / https://example.com/a",
      "Date: unknown",
      "Quality: high",
      "Authority: low",
      "Summary: Summary",
      "Page Content: /tmp/pi-dstools/search/uuid/1.md",
      "Total Lines: 428",
    ].join("\n"),
  );
  const {
    pageContentPath: _pageContentPath,
    pageContentLines: _pageContentLines,
    ...withoutContent
  } = record;
  expect(formatResultsForModel([withoutContent])).not.toContain("Page Content:");
  expect(formatResultsForModel([withoutContent])).not.toContain("Total Lines:");
}

function omitsTotalLinesWhenOnlyAPathIsKnown() {
  const record = { ...makeRecord(1), pageContentPath: "/tmp/pi-dstools/search/uuid/1.md" };
  const formatted = formatResultsForModel([record]);
  expect(formatted).toContain("Page Content: /tmp/pi-dstools/search/uuid/1.md");
  expect(formatted).not.toContain("Total Lines:");
}

function rendersTuiLinksAndCollapsedHint() {
  const records = Array.from({ length: 4 }, (_, index) => ({
    index: index + 1,
    title: `Title ${index + 1}`,
    siteName: "Example",
    url: `https://example.com/${index + 1}`,
    date: "2026-06-01",
    snippet: `Snippet ${index + 1}`,
    summary: `Summary ${index + 1}`,
    quality: "high" as const,
    authority: "high" as const,
  }));
  expect(formatResultsForTui(records, { maxResults: 3 })).toBe(
    [
      "1. [Title 1](https://example.com/1)",
      "   Example / 2026-06-01",
      "Snippet 1",
      "",
      "2. [Title 2](https://example.com/2)",
      "   Example / 2026-06-01",
      "Snippet 2",
      "",
      "3. [Title 3](https://example.com/3)",
      "   Example / 2026-06-01",
      "Snippet 3",
      "",
      "... 1 more results (expand to view all)",
    ].join("\n"),
  );
  expect(formatResultsForTui([])).toBe("No results found.");
}

function escapesMarkdownLinkSyntax() {
  const record = {
    index: 1,
    title: "A [bold] \\ title\nwith a newline",
    siteName: null,
    url: "https://example.com/a(b)?q=1 2",
    date: null,
    snippet: "Snippet",
    summary: "Summary",
    quality: "high" as const,
    authority: "low" as const,
  };
  expect(formatResultsForTui([record])).toBe(
    [
      "1. [A \\[bold\\] \\\\ title with a newline](https://example.com/a\\(b\\)?q=1%202)",
      "   unknown / unknown",
      "Snippet",
    ].join("\n"),
  );
}

function createsStableErrorDetails() {
  expect(createErrorDetails("query", "failed")).toEqual({
    query: "query",
    resultCount: 0,
    results: [],
    error: "failed",
  });
}

function showsAllResultsForNonPositiveLimit() {
  const records = [makeRecord(1), makeRecord(2)];
  expect(formatResultsForTui(records, { maxResults: 0 })).toContain("2. [Title 2]");
  expect(formatResultsForTui(records, { maxResults: -1 })).toContain("2. [Title 2]");
}

function rendersBlankMetadataAsUnknown() {
  const record = { ...makeRecord(1), siteName: "   ", date: "" };
  const formatted = formatResultsForModel([record]);
  expect(formatted).toContain("Site: unknown");
  expect(formatted).toContain("Date: unknown");
}

describe("result formatting", () => {
  it("computes quality and authority thresholds", computesQualityAndAuthorityThresholds);
  it(
    "renders the exact model-facing format with unknown metadata and a conditional page path",
    rendersModelFormatWithUnknownMetadata,
  );
  it("omits Total Lines when only a page path is known", omitsTotalLinesWhenOnlyAPathIsKnown);
  it(
    "renders TUI lines as Markdown links and a collapsed-view hint",
    rendersTuiLinksAndCollapsedHint,
  );
  it("escapes Markdown link syntax in titles and URLs", escapesMarkdownLinkSyntax);
  it("creates a stable error details shape", createsStableErrorDetails);
});

describe("formatting defaults and boundaries", () => {
  it(
    "shows all results when the collapsed limit is non-positive",
    showsAllResultsForNonPositiveLimit,
  );
  it("renders blank metadata as unknown", rendersBlankMetadataAsUnknown);
});
