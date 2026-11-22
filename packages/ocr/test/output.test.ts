import { readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

import { PREVIEW_LENGTH } from "@pi-dstools/deepseek";
import { describe, expect, it } from "vitest";

import {
  EMPTY_CONTENT_COMMENT,
  EMPTY_STRUCTURED_CONTENT,
  FULL_CONTENT_COMMENT,
  PREVIEW_COMMENT,
  TABLE_OF_CONTENTS_COMMENT,
  createErrorDetails,
  prepareOcrOutput,
} from "../src/output";
import {
  contentOptions,
  fakeContentFileSystem,
  hostCast,
  makeOcrResponse,
  makeRequest,
} from "./helpers";

const REQUEST = makeRequest();
const CONTENT_PATH = join("/tmp", "pi-dstools", "ocr", "uuid", "pages.md");

async function returnsShortContentInlineWithoutAFile() {
  const { fs, mkdir, writeFile } = fakeContentFileSystem();
  const response = makeOcrResponse();
  const prepared = await prepareOcrOutput(REQUEST, response, contentOptions(fs));
  expect(prepared.contentText).toContain(FULL_CONTENT_COMMENT);
  expect(prepared.contentText).toContain("Hello");
  expect(prepared.contentText).not.toContain("Full Content:");
  expect(prepared.details).toEqual({
    path: REQUEST.path,
    filename: REQUEST.filename,
    purpose: REQUEST.purpose,
    pageCount: 1,
    summary: "Hello",
  });
  expect(prepared.structuredContent).toBe(response);
  expect(mkdir).not.toHaveBeenCalled();
  expect(writeFile).not.toHaveBeenCalled();
}

async function keepsShortBodyInlineWithLongMetadata() {
  const { fs, mkdir, writeFile } = fakeContentFileSystem();
  const long = "x".repeat(PREVIEW_LENGTH);
  const request = makeRequest({ path: `/workspace/${long}.pdf`, filename: `${long}.pdf` });
  const response = makeOcrResponse({ id: `ocr-${long}` });
  const prepared = await prepareOcrOutput(request, response, contentOptions(fs));
  expect(prepared.contentText).toContain(FULL_CONTENT_COMMENT);
  expect(prepared.contentText).toContain("Hello");
  expect(prepared.details.contentPath).toBeUndefined();
  expect(mkdir).not.toHaveBeenCalled();
  expect(writeFile).not.toHaveBeenCalled();
}

async function returnsEmptyResultWithoutAFile() {
  const { fs, mkdir, writeFile } = fakeContentFileSystem();
  const response = makeOcrResponse({ page_count: 0, pages: [] });
  const prepared = await prepareOcrOutput(REQUEST, response, contentOptions(fs));
  expect(prepared.contentText).toContain(EMPTY_CONTENT_COMMENT);
  expect(prepared.contentText).not.toContain("Full Content:");
  expect(prepared.details.summary).toBe("");
  expect(prepared.details.pageCount).toBe(0);
  expect(prepared.structuredContent).toBe(response);
  expect(mkdir).not.toHaveBeenCalled();
  expect(writeFile).not.toHaveBeenCalled();
}

async function writesLongContentWithoutHeadingsAndReturnsPreview() {
  const { fs, mkdir, writeFile } = fakeContentFileSystem();
  const text = "a".repeat(PREVIEW_LENGTH + 50);
  const response = makeOcrResponse({
    pages: [{ index: 0, text, finish_reason: "stop" }],
  });
  const prepared = await prepareOcrOutput(REQUEST, response, contentOptions(fs));
  expect(prepared.contentText).toContain(PREVIEW_COMMENT);
  expect(prepared.contentText).toContain(`Full Content: ${CONTENT_PATH}`);
  expect(prepared.contentText).toContain("Total Lines:");
  expect(prepared.details.contentPath).toBe(CONTENT_PATH);
  expect(prepared.details.totalLines).toBeGreaterThan(0);
  expect(prepared.details.summary).toMatch(/^\s*---/u);
  expect(prepared.details.summary.endsWith("...")).toBe(true);
  expect(mkdir).toHaveBeenCalledWith(dirname(CONTENT_PATH), { recursive: true });
  expect(writeFile).toHaveBeenCalledWith(CONTENT_PATH, expect.stringContaining(text), "utf8");
}

async function writesLongContentWithHeadingsAndReturnsTable() {
  const { fs, writeFile } = fakeContentFileSystem();
  const text = `# Heading\n\n${"a".repeat(PREVIEW_LENGTH + 50)}`;
  const response = makeOcrResponse({
    pages: [{ index: 0, text, finish_reason: "stop" }],
  });
  const prepared = await prepareOcrOutput(REQUEST, response, contentOptions(fs));
  expect(prepared.contentText).toContain(TABLE_OF_CONTENTS_COMMENT);
  expect(prepared.details.summary).toContain("| H1 | Heading |");
  const saved = hostCast<string>(writeFile.mock.calls[0]?.[1]);
  expect(saved).toContain("# Heading");
}

async function writesMultiPageContentWithWarningsAndSanitizesControls() {
  const { fs, writeFile } = fakeContentFileSystem();
  const response = makeOcrResponse({
    page_count: 2,
    pages: [
      { index: 0, text: "Page\u0003one", finish_reason: "stop" },
      { index: 1, text: "B".repeat(PREVIEW_LENGTH), finish_reason: "length" },
    ],
  });
  const prepared = await prepareOcrOutput(REQUEST, response, contentOptions(fs));
  expect(prepared.contentText).toContain(TABLE_OF_CONTENTS_COMMENT);
  expect(prepared.contentText).not.toContain(PREVIEW_COMMENT);
  expect(prepared.details.pageCount).toBe(2);
  const saved = hostCast<string>(writeFile.mock.calls[0]?.[1]);
  expect(saved).toContain("## Page 1");
  expect(saved).toContain("> Warning: page 2 may be incomplete.");
  expect(saved).toContain("Page one");
  expect(saved).not.toContain("\u0003");
}

async function usesDefaultFileSystem() {
  const response = makeOcrResponse({
    pages: [{ index: 0, text: "z".repeat(PREVIEW_LENGTH + 1), finish_reason: "stop" }],
  });
  const prepared = await prepareOcrOutput(REQUEST, response);
  const contentPath = hostCast<string>(prepared.details.contentPath);
  const directory = dirname(contentPath);
  try {
    expect(directory).toContain(join(tmpdir(), "pi-dstools", "ocr"));
    expect(contentPath).toBe(join(directory, "pages.md"));
    await expect(readFile(contentPath, "utf8")).resolves.toContain("z".repeat(PREVIEW_LENGTH + 1));
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function failsWhenTheResultFileCannotBeWritten() {
  const response = makeOcrResponse({
    pages: [{ index: 0, text: "a".repeat(PREVIEW_LENGTH + 50), finish_reason: "stop" }],
  });
  const mkdirFailure = fakeContentFileSystem({ failMkdir: true });
  const writeFailure = fakeContentFileSystem({ failWrite: true });
  await Promise.all([
    expect(
      prepareOcrOutput(REQUEST, response, contentOptions(mkdirFailure.fs)),
    ).rejects.toMatchObject({ kind: "filesystem" }),
    expect(
      prepareOcrOutput(REQUEST, response, contentOptions(writeFailure.fs)),
    ).rejects.toMatchObject({ kind: "filesystem" }),
  ]);
}

function createsStableErrorDetailsAndPreviewComment() {
  expect(createErrorDetails("bad.pdf", "failed")).toEqual({
    path: "bad.pdf",
    filename: "",
    purpose: "text_recognition",
    pageCount: 0,
    summary: "",
    error: "failed",
  });
  expect(PREVIEW_COMMENT).toBe(
    `<!-- The following is a preview of the first ${PREVIEW_LENGTH} characters -->`,
  );
  expect(EMPTY_STRUCTURED_CONTENT.page_count).toBe(0);
}

describe("prepareOcrOutput", () => {
  it("returns short content inline without a file", returnsShortContentInlineWithoutAFile);
  it("keeps short body inline with long metadata", keepsShortBodyInlineWithLongMetadata);
  it("returns an empty result without a file", returnsEmptyResultWithoutAFile);
  it(
    "writes long content without headings and returns a preview",
    writesLongContentWithoutHeadingsAndReturnsPreview,
  );
  it(
    "writes long content with headings and returns a table",
    writesLongContentWithHeadingsAndReturnsTable,
  );
  it(
    "writes multi-page content with warnings and sanitizes controls",
    writesMultiPageContentWithWarningsAndSanitizesControls,
  );
  it("uses the default file system", usesDefaultFileSystem);
  it("fails when the result file cannot be written", failsWhenTheResultFileCannotBeWritten);
  it(
    "creates stable error details and describes the preview",
    createsStableErrorDetailsAndPreviewComment,
  );
});
