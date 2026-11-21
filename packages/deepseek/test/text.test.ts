import { describe, expect, it } from "vitest";

import {
  displayContent,
  displayText,
  markdownLinkText,
  markdownLinkUrl,
  retryMessage,
  splitContentLines,
  truncateText,
  unicodeLength,
} from "../src/index";

function sanitizesDisplayAndContentText() {
  expect(displayText("A\nB\t\u0001C")).toBe("A B C");
  expect(displayContent("# A\n\nB\t\u0001C\u007FD")).toBe("# A\n\nB\t C D");
}

function formatsLinksTruncationAndRetryMessages() {
  expect(markdownLinkText("A [bold] \\ title")).toBe("A \\[bold\\] \\\\ title");
  expect(markdownLinkUrl("https://example.com/a(b)?q=1 2")).toBe(
    "https://example.com/a\\(b\\)?q=1%202",
  );
  expect(truncateText("short")).toBe("short");
  expect(truncateText("x".repeat(100))).toBe(`${"x".repeat(77)}...`);
  expect(truncateText("abcdef", 5)).toBe("ab...");
  expect(unicodeLength("😀a")).toBe(2);
  expect(retryMessage({ attempt: 1, maxRetries: 2, status: 429 })).toBe(
    "Retrying (1/2) after HTTP 429...",
  );
}

function splitsContentIntoFileLines() {
  expect(splitContentLines("")).toEqual([""]);
  expect(splitContentLines("# A\n## B")).toEqual(["# A", "## B"]);
  expect(splitContentLines("# A\r\n\r\n## B\n")).toEqual(["# A", "", "## B", ""]);
  expect(splitContentLines("A\rB\nC")).toEqual(["A", "B", "C"]);
}

describe("shared text helpers", () => {
  it("sanitizes display and content text", sanitizesDisplayAndContentText);
  it("formats links, truncation, and retry messages", formatsLinksTruncationAndRetryMessages);
  it("splits content into file lines across line-ending styles", splitsContentIntoFileLines);
});
