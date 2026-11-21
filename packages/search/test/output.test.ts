import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DeepSeekToolError } from "@pi-dstools/deepseek";
import { describe, expect, it } from "vitest";

import { prepareSearchOutput } from "../src/output";
import { contentOptions, fakeFileSystem, hostCast, makeResult } from "./helpers";

async function writesNoFilesWithoutPageContent() {
  const { fs, mkdir, writeFile } = fakeFileSystem();
  const response = { results: [makeResult({ content: "should not be written" })] };
  const prepared = await prepareSearchOutput(
    { query: "DeepSeek", count: 10, need_content: false },
    response,
    contentOptions(fs),
  );

  expect(mkdir).not.toHaveBeenCalled();
  expect(writeFile).not.toHaveBeenCalled();
  expect(prepared.details.results[0]?.pageContentPath).toBeUndefined();
  expect(prepared.contentText).not.toContain("Page Content:");
  expect(prepared.contentText).not.toContain("Total Lines:");
  expect(prepared.structuredContent).toBe(response.results);
}

async function writesOnlyNonEmptyPageContent() {
  const { fs, mkdir, writeFile } = fakeFileSystem();
  const firstContent = "# First page\r\n\r\nDetails\n";
  const response = {
    results: [
      makeResult({ title: "First", content: firstContent }),
      makeResult({ title: "Second", content: "   " }),
    ],
  };
  const dir = join("/tmp", "pi-dstools", "search", "uuid");
  const prepared = await prepareSearchOutput(
    { query: "DeepSeek", count: 10, need_content: true },
    response,
    contentOptions(fs),
  );

  expect(mkdir).toHaveBeenCalledWith(dir, { recursive: true });
  expect(writeFile).toHaveBeenCalledTimes(1);
  expect(writeFile).toHaveBeenCalledWith(join(dir, "1.md"), firstContent, "utf8");
  expect(prepared.details.searchId).toBe("uuid");
  expect(prepared.details.pageContentDir).toBe(dir);
  expect(prepared.details.results[0]?.pageContentPath).toBe(join(dir, "1.md"));
  expect(prepared.details.results[0]?.pageContentLines).toBe(4);
  expect(prepared.details.results[1]?.pageContentPath).toBeUndefined();
  expect(prepared.details.results[1]?.pageContentLines).toBeUndefined();
  expect(prepared.contentText.match(/Page Content:/gu)).toHaveLength(1);
  expect(prepared.contentText).toContain(`Page Content: ${join(dir, "1.md")}`);
  expect(prepared.contentText).toContain("Total Lines: 4");
  expect(prepared.structuredContent).toBe(response.results);
}

async function failsWhenPageContentCannotBeWritten() {
  const { fs } = fakeFileSystem({ failWrite: true });
  const response = { results: [makeResult({ content: "# page" })] };
  await expect(
    prepareSearchOutput(
      { query: "DeepSeek", count: 10, need_content: true },
      response,
      contentOptions(fs),
    ),
  ).rejects.toBeInstanceOf(DeepSeekToolError);
  await expect(
    prepareSearchOutput(
      { query: "DeepSeek", count: 10, need_content: true },
      response,
      contentOptions(fs),
    ),
  ).rejects.toMatchObject({ kind: "filesystem" });
}

async function keepsHighAndLowLabels() {
  const { fs } = fakeFileSystem();
  const response = {
    results: [
      makeResult({ rerank_score: 1.5, authority: 3 }),
      makeResult({ rerank_score: 1.4, authority: -1, title: "Low", site_name: null, date: null }),
    ],
  };
  const prepared = await prepareSearchOutput(
    { query: "DeepSeek", count: 10, need_content: false },
    response,
    contentOptions(fs),
  );
  expect(prepared.details.results.map((record) => [record.quality, record.authority])).toEqual([
    ["high", "high"],
    ["low", "low"],
  ]);
  expect(prepared.contentText).toContain("unknown");
}

async function writesUsingTheDefaultFileSystem() {
  const prepared = await prepareSearchOutput(
    { query: "DeepSeek", count: 10, need_content: true },
    { results: [makeResult({ content: "# First page" })] },
  );
  const searchId = hostCast<string>(prepared.details.searchId);
  const directory = hostCast<string>(prepared.details.pageContentDir);
  expect(searchId).toMatch(/^[0-9a-f-]{36}$/u);
  try {
    expect(directory).toBe(join(tmpdir(), "pi-dstools", "search", searchId));
    const path = join(directory, "1.md");
    expect(prepared.details.results[0]?.pageContentPath).toBe(path);
    expect(prepared.contentText).toContain(`Page Content: ${path}`);
    expect(prepared.contentText).toContain("Total Lines: 1");
    await expect(readFile(path, "utf8")).resolves.toBe("# First page");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function reportsNoResultsWithoutContentMetadata() {
  const prepared = await prepareSearchOutput(
    { query: "nothing", count: 10, need_content: true },
    { results: [] },
  );
  expect(prepared.contentText).toBe("No results found.");
  expect(prepared.details.resultCount).toBe(0);
  expect(prepared.details.searchId).toBeUndefined();
  expect(prepared.details.pageContentDir).toBeUndefined();
}

async function skipsTheContentDirectoryForBlankContent() {
  const prepared = await prepareSearchOutput(
    { query: "DeepSeek", count: 10, need_content: true },
    { results: [makeResult({ content: "   \n\t" })] },
    { tmpdir: () => "/tmp/pi-dstools-blank", uuid: () => "uuid" },
  );
  expect(prepared.details.results[0]?.pageContentPath).toBeUndefined();
  expect(prepared.details.searchId).toBeUndefined();
  expect(prepared.details.pageContentDir).toBeUndefined();
}

describe("prepareSearchOutput", () => {
  it(
    "writes no files and omits Page Content when need_content is false",
    writesNoFilesWithoutPageContent,
  );
  it("writes only non-empty page content and includes paths", writesOnlyNonEmptyPageContent);
  it(
    "fails the whole result when a page-content file cannot be written",
    failsWhenPageContentCannotBeWritten,
  );
  it("keeps labels for high and low quality/authority", keepsHighAndLowLabels);
});

describe("default filesystem behavior", () => {
  it(
    "writes page content using the default temp directory, UUID, and filesystem",
    writesUsingTheDefaultFileSystem,
  );
  it(
    "reports no results and does not create content metadata for an empty response",
    reportsNoResultsWithoutContentMetadata,
  );
  it(
    "does not create a content directory when returned page content is blank",
    skipsTheContentDirectoryForBlankContent,
  );
});
