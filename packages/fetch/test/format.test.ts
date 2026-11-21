import { describe, expect, it } from "vitest";

import { formatFetchForTui } from "../src/format";
import { makeDetails } from "./helpers";

function showsTitleAndContentPathRegardlessOfExpansion() {
  const details = makeDetails({
    title: "A [bold] \\ title",
    url: "https://example.com/a(b)?q=1 2",
    summary: "Summary",
    contentPath: "/tmp/page.md",
  });
  const expected = "A \\[bold\\] \\\\ title (/tmp/page.md)";
  expect(formatFetchForTui(details, "# Full", false)).toBe(expected);
  expect(formatFetchForTui(details, "# Full", true)).toBe(expected);
  expect(expected).not.toContain("https://example.com");
}

function showsTitleAndFullContentWithoutAContentPathRegardlessOfExpansion() {
  const details = makeDetails({ title: "   ", summary: "Summary" });
  const expected = ["Untitled page", "# Full", "", "Text"].join("\n");
  expect(formatFetchForTui(details, "# Full\n\nText", false)).toBe(expected);
  expect(formatFetchForTui(details, "# Full\n\nText", true)).toBe(expected);
}

function showsTitleAndSummaryWithoutAContentPathRegardlessOfExpansion() {
  const details = makeDetails({ summary: "# Short\n\nText" });
  const expected = ["Example article", "# Short", "", "Text"].join("\n");
  expect(formatFetchForTui(details, "", false)).toBe(expected);
  expect(formatFetchForTui(details, "", true)).toBe(expected);
}

function showsTitleAndEmptyMessageRegardlessOfExpansion() {
  const details = makeDetails({ summary: "" });
  const expected = ["Example article", "Page content is empty."].join("\n");
  expect(formatFetchForTui(details, "---\nTitle: Example article\n---", false)).toBe(expected);
  expect(formatFetchForTui(details, "---\nTitle: Example article\n---", true)).toBe(expected);
}

function defaultsToTitleAndSummaryWithoutOptionalArguments() {
  const details = makeDetails({ summary: "Summary" });
  expect(formatFetchForTui(details)).toBe(["Example article", "Summary"].join("\n"));
}

function sanitizesTitleAndContentPath() {
  const details = makeDetails({
    title: "T\u0001itle",
    url: "https://example.com/a\u0002b",
    summary: "Summary",
    contentPath: "/tmp/a\u0004b.md",
  });
  expect(formatFetchForTui(details, "full", false)).toBe("T itle (/tmp/a b.md)");
}

function sanitizesShortContent() {
  const details = makeDetails({
    title: "T\u0001itle",
    url: "https://example.com/a\u0002b",
    summary: "S\u0003ummary",
  });
  expect(formatFetchForTui(details, "", false)).toBe(["T itle", "S ummary"].join("\n"));
}

function sanitizesFullContent() {
  const details = makeDetails({ summary: "Summary" });
  expect(formatFetchForTui(details, "F\u0003ull", false)).toBe(
    ["Example article", "F ull"].join("\n"),
  );
}

describe("formatFetchForTui", () => {
  it(
    "shows the title and content path regardless of expansion",
    showsTitleAndContentPathRegardlessOfExpansion,
  );
  it(
    "shows the title and full content without a content path regardless of expansion",
    showsTitleAndFullContentWithoutAContentPathRegardlessOfExpansion,
  );
  it(
    "shows the title and summary without a content path regardless of expansion",
    showsTitleAndSummaryWithoutAContentPathRegardlessOfExpansion,
  );
  it(
    "shows the title and empty message regardless of expansion",
    showsTitleAndEmptyMessageRegardlessOfExpansion,
  );
  it(
    "defaults to the title and summary without optional arguments",
    defaultsToTitleAndSummaryWithoutOptionalArguments,
  );
  it("sanitizes the title and content path", sanitizesTitleAndContentPath);
  it("sanitizes short content", sanitizesShortContent);
  it("sanitizes full content", sanitizesFullContent);
});
