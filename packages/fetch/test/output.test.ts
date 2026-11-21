import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import {
  createErrorDetails,
  EMPTY_CONTENT_COMMENT,
  FULL_CONTENT_COMMENT,
  PREVIEW_COMMENT,
  PREVIEW_LENGTH,
  TABLE_OF_CONTENTS_COMMENT,
  prepareFetchOutput,
} from "../src/output";
import { contentOptions, fakeFileSystem, hostCast, makeFetchResponse } from "./helpers";

const REQUEST = { url: "https://example.com/article" } as const;

function headingContent(): string {
  return [
    "# Example article",
    "",
    "## **Install** [guide](https://example.com) ###",
    "",
    "```md",
    "# Hidden heading",
    "```",
    "",
    "### Config | Advanced `options`",
    "",
    "x".repeat(320),
  ].join("\n");
}

function headingTable(): string {
  return [
    "| Line | Level | Heading |",
    "| --- | --- | --- |",
    "| L1 | H1 | Example article |",
    "| L3 | H2 | **Install** [guide](https://example.com) |",
    "| L9 | H3 | Config \\| Advanced `options` |",
  ].join("\n");
}

async function returnsShortContentInlineWithoutAFile() {
  const { fs, mkdir, writeFile } = fakeFileSystem();
  const response = makeFetchResponse({ content: "# Short\n\nText" });
  const prepared = await prepareFetchOutput(REQUEST, response, contentOptions(fs));
  expect(prepared.contentText).toBe(
    [
      "---",
      "Title: Example article",
      "URL: https://example.com/article",
      "---",
      "",
      FULL_CONTENT_COMMENT,
      "",
      "# Short",
      "",
      "Text",
    ].join("\n"),
  );
  expect(prepared.contentText).not.toContain("Total Lines:");
  expect(prepared.details).toEqual({
    url: REQUEST.url,
    title: "Example article",
    summary: response.content,
  });
  expect(prepared.structuredContent).toBe(response);
  expect(mkdir).not.toHaveBeenCalled();
  expect(writeFile).not.toHaveBeenCalled();
}

async function returnsEmptyContentWithoutAFile() {
  const { fs, mkdir, writeFile } = fakeFileSystem();
  const response = makeFetchResponse({ content: "   \n\t" });
  const prepared = await prepareFetchOutput(REQUEST, response, contentOptions(fs));
  expect(prepared.contentText).toBe(
    [
      "---",
      "Title: Example article",
      "URL: https://example.com/article",
      "---",
      "",
      EMPTY_CONTENT_COMMENT,
      "",
    ].join("\n"),
  );
  expect(prepared.contentText).not.toContain("Total Lines:");
  expect(prepared.details).toEqual({
    url: REQUEST.url,
    title: "Example article",
    summary: "",
  });
  expect(prepared.structuredContent).toBe(response);
  expect(mkdir).not.toHaveBeenCalled();
  expect(writeFile).not.toHaveBeenCalled();
}

async function writesLongContentAndReturnsAHeadingTable() {
  const { fs, mkdir, writeFile } = fakeFileSystem();
  const content = headingContent();
  const response = makeFetchResponse({ content });
  const prepared = await prepareFetchOutput(REQUEST, response, contentOptions(fs));
  const directory = join("/tmp", "pi-dstools", "fetch", "uuid");
  const contentPath = join(directory, "page.md");
  expect(prepared.contentText).toBe(
    [
      "---",
      "Title: Example article",
      "URL: https://example.com/article",
      `Full Content: ${contentPath}`,
      "Total Lines: 11",
      "---",
      "",
      TABLE_OF_CONTENTS_COMMENT,
      "",
      headingTable(),
    ].join("\n"),
  );
  expect(prepared.contentText).not.toContain(PREVIEW_COMMENT);
  expect(prepared.contentText).not.toContain("x".repeat(320));
  expect(mkdir).toHaveBeenCalledWith(directory, { recursive: true });
  expect(writeFile).toHaveBeenCalledWith(contentPath, content, "utf8");
  expect(prepared.details).toEqual({
    url: REQUEST.url,
    title: "Example article",
    contentPath,
    summary: headingTable(),
  });
  expect(prepared.structuredContent).toBe(response);
}

async function fallsBackToPreviewForLongContentWithoutHeadings() {
  const { fs, mkdir, writeFile } = fakeFileSystem();
  const content = "a".repeat(301);
  const response = makeFetchResponse({ content });
  const prepared = await prepareFetchOutput(REQUEST, response, contentOptions(fs));
  const directory = join("/tmp", "pi-dstools", "fetch", "uuid");
  const contentPath = join(directory, "page.md");
  expect(prepared.contentText).toBe(
    [
      "---",
      "Title: Example article",
      "URL: https://example.com/article",
      `Full Content: ${contentPath}`,
      "Total Lines: 1",
      "---",
      "",
      PREVIEW_COMMENT,
      "",
      `${"a".repeat(300)}...`,
    ].join("\n"),
  );
  expect(prepared.contentText).not.toContain(TABLE_OF_CONTENTS_COMMENT);
  expect(mkdir).toHaveBeenCalledWith(directory, { recursive: true });
  expect(writeFile).toHaveBeenCalledWith(contentPath, content, "utf8");
  expect(prepared.details).toEqual({
    url: REQUEST.url,
    title: "Example article",
    contentPath,
    summary: `${"a".repeat(300)}...`,
  });
  expect(prepared.structuredContent).toBe(response);
}

async function usesRawUnicodeCodePointsForTheBoundary() {
  const { fs: shortFs, mkdir, writeFile } = fakeFileSystem();
  const exact = makeFetchResponse({ content: "😀".repeat(300) });
  const short = await prepareFetchOutput(REQUEST, exact, contentOptions(shortFs));
  expect(short.contentText).toContain(FULL_CONTENT_COMMENT);
  expect(short.details.contentPath).toBeUndefined();
  expect(short.details.summary).toBe("😀".repeat(300));
  expect(mkdir).not.toHaveBeenCalled();
  expect(writeFile).not.toHaveBeenCalled();

  const { fs: longFs, mkdir: longMkdir } = fakeFileSystem();
  const long = await prepareFetchOutput(
    REQUEST,
    makeFetchResponse({ content: "😀".repeat(301) }),
    contentOptions(longFs),
  );
  expect(long.contentText).toContain(PREVIEW_COMMENT);
  expect(long.details.summary).toBe(`${"😀".repeat(300)}...`);
  expect(longMkdir).toHaveBeenCalledTimes(1);
}

async function stripsControlCharactersFromTheFallbackPreview() {
  const { fs } = fakeFileSystem();
  const response = makeFetchResponse({ content: `${"\u0001".repeat(301)}x` });
  const prepared = await prepareFetchOutput(REQUEST, response, contentOptions(fs));
  expect(prepared.details.summary).toBe(" x");
  expect(prepared.contentText).toContain(" x");
  expect(prepared.contentText).not.toContain("...");
  expect(prepared.contentText).toContain(PREVIEW_COMMENT);
}

async function usesTheDefaultFileSystem() {
  const content = "z".repeat(301);
  const prepared = await prepareFetchOutput(REQUEST, makeFetchResponse({ content }));
  const contentPath = hostCast<string>(prepared.details.contentPath);
  const directory = dirname(contentPath);
  try {
    expect(directory).toContain(join(tmpdir(), "pi-dstools", "fetch"));
    expect(contentPath).toBe(join(directory, "page.md"));
    await expect(readFile(contentPath, "utf8")).resolves.toBe(content);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function failsWhenTheContentFileCannotBeWritten() {
  const failures: readonly {
    readonly failMkdir?: boolean;
    readonly failWrite?: boolean;
  }[] = [{ failMkdir: true }, { failWrite: true }];
  await Promise.all(
    failures.map(async (options) => {
      const { fs } = fakeFileSystem(options);
      await expect(
        prepareFetchOutput(
          REQUEST,
          makeFetchResponse({ content: "a".repeat(301) }),
          contentOptions(fs),
        ),
      ).rejects.toMatchObject({ kind: "filesystem" });
    }),
  );
}

async function countsSavedFileLinesAcrossLineEndings() {
  const { fs } = fakeFileSystem();
  const content = ["# Long", "", "a".repeat(301)].join("\r\n") + "\n";
  const prepared = await prepareFetchOutput(
    REQUEST,
    makeFetchResponse({ content }),
    contentOptions(fs),
  );
  expect(prepared.contentText).toContain("Total Lines: 4");
  expect(prepared.contentText).toContain(TABLE_OF_CONTENTS_COMMENT);
}

function createsStableErrorDetails() {
  expect(createErrorDetails("https://example.com", "failed")).toEqual({
    url: "https://example.com",
    title: "",
    summary: "",
    error: "failed",
  });
}

function describesThePreviewCharacterCount() {
  expect(PREVIEW_COMMENT).toBe(
    `<!-- The following is a preview of the first ${PREVIEW_LENGTH} characters -->`,
  );
}

describe("prepareFetchOutput", () => {
  it("returns short content inline without a file", returnsShortContentInlineWithoutAFile);
  it("returns empty content without a file", returnsEmptyContentWithoutAFile);
  it("writes long content and returns a heading table", writesLongContentAndReturnsAHeadingTable);
  it("falls back to a preview without headings", fallsBackToPreviewForLongContentWithoutHeadings);
  it("uses raw Unicode code points for the boundary", usesRawUnicodeCodePointsForTheBoundary);
  it(
    "strips control characters from the fallback preview",
    stripsControlCharactersFromTheFallbackPreview,
  );
  it("counts saved file lines across line endings", countsSavedFileLinesAcrossLineEndings);
  it("uses the default filesystem", usesTheDefaultFileSystem);
  it("fails when the content file cannot be written", failsWhenTheContentFileCannotBeWritten);
  it("creates stable error details", createsStableErrorDetails);
  it("describes the preview character count", describesThePreviewCharacterCount);
});
