import { join } from "node:path";

import {
  PREVIEW_LENGTH,
  contentDirectory,
  displayContent,
  displayText,
  extractHeadings,
  formatHeadingTable,
  previewText,
  resolveContentOptions,
  splitContentLines,
  unicodeLength,
  writeContentFiles,
  type ContentOptions,
} from "@pi-dstools/deepseek";

import { DEFAULT_OCR_PURPOSE } from "./constants";
import type {
  DeepSeekOcrResponse,
  NormalizedOcrRequest,
  OcrToolDetails,
  PreparedOcrOutput,
} from "./types";

export const PREVIEW_COMMENT = `<!-- The following is a preview of the first ${PREVIEW_LENGTH} characters -->`;
export const FULL_CONTENT_COMMENT = "<!-- The following is the full content -->";
export const EMPTY_CONTENT_COMMENT = "<!-- OCR result is empty -->";
export const TABLE_OF_CONTENTS_COMMENT = "<!-- Table of contents -->";

export const EMPTY_STRUCTURED_CONTENT: DeepSeekOcrResponse = {
  id: "",
  object: "ocr.result",
  created: 0,
  purpose: DEFAULT_OCR_PURPOSE,
  page_count: 0,
  pages: [],
  usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
};

interface FullContentFile {
  readonly path: string;
  readonly totalLines: number;
}

function buildOcrBody(response: DeepSeekOcrResponse): string {
  const sections = response.pages.map((page) => {
    const lines = response.pages.length === 1 ? [] : [`## Page ${page.index + 1}`];
    if (page.finish_reason === "length") {
      lines.push(`> Warning: page ${page.index + 1} may be incomplete.`);
    }
    lines.push("", displayContent(page.text));
    return lines.join("\n");
  });
  return sections.join("\n\n").trim();
}

function metadataLines(request: NormalizedOcrRequest, response: DeepSeekOcrResponse): string[] {
  return [
    "---",
    `ID: ${displayText(response.id)}`,
    `File: ${displayText(request.filename)}`,
    `Path: ${displayText(request.path)}`,
    `Purpose: ${displayText(response.purpose)}`,
    `Page Count: ${response.page_count}`,
    `Input Tokens: ${response.usage.input_tokens}`,
    `Output Tokens: ${response.usage.output_tokens}`,
    `Total Tokens: ${response.usage.total_tokens}`,
  ];
}

function buildDocument(
  request: NormalizedOcrRequest,
  response: DeepSeekOcrResponse,
  body: string,
): string {
  const lines = [...metadataLines(request, response), "---", ""];
  if (body.length > 0) lines.push(body);
  return lines.join("\n");
}

function buildContentText(
  request: NormalizedOcrRequest,
  response: DeepSeekOcrResponse,
  file: FullContentFile | undefined,
  comment: string,
  summary: string,
): string {
  const lines = metadataLines(request, response);
  if (file !== undefined) {
    lines.push(`Full Content: ${file.path}`, `Total Lines: ${file.totalLines}`);
  }
  lines.push("---", "", comment, "");
  if (summary.length > 0) lines.push(summary);
  return lines.join("\n");
}

function inlineOutput(
  request: NormalizedOcrRequest,
  response: DeepSeekOcrResponse,
  comment: string,
  body: string,
  summary: string,
): PreparedOcrOutput {
  return {
    contentText: buildContentText(request, response, undefined, comment, summary),
    details: {
      path: request.path,
      filename: request.filename,
      purpose: request.purpose,
      pageCount: response.page_count,
      summary,
    },
    structuredContent: response,
  };
}

async function fileOutput(
  request: NormalizedOcrRequest,
  response: DeepSeekOcrResponse,
  document: string,
  comment: string,
  summary: string,
  options: ContentOptions,
): Promise<PreparedOcrOutput> {
  const { makeTempDir, makeUuid, fileSystem } = resolveContentOptions(options);
  const directory = contentDirectory(makeTempDir(), "ocr", makeUuid());
  const file: FullContentFile = {
    path: join(directory, "pages.md"),
    totalLines: splitContentLines(document).length,
  };
  await writeContentFiles(
    fileSystem,
    directory,
    [{ path: file.path, content: document }],
    "Failed to save DeepSeek OCR result",
  );
  return {
    contentText: buildContentText(request, response, file, comment, summary),
    details: {
      path: request.path,
      filename: request.filename,
      purpose: request.purpose,
      pageCount: response.page_count,
      contentPath: file.path,
      totalLines: file.totalLines,
      summary,
    },
    structuredContent: response,
  };
}

export function prepareOcrOutput(
  request: NormalizedOcrRequest,
  response: DeepSeekOcrResponse,
  options: ContentOptions = {},
): Promise<PreparedOcrOutput> {
  const body = buildOcrBody(response);
  const document = buildDocument(request, response, body);
  if (body.trim().length === 0) {
    return Promise.resolve(inlineOutput(request, response, EMPTY_CONTENT_COMMENT, "", ""));
  }
  if (unicodeLength(body) <= PREVIEW_LENGTH) {
    return Promise.resolve(inlineOutput(request, response, FULL_CONTENT_COMMENT, body, body));
  }

  const headings = extractHeadings(document);
  const comment = headings.length > 0 ? TABLE_OF_CONTENTS_COMMENT : PREVIEW_COMMENT;
  const summary = headings.length > 0 ? formatHeadingTable(headings) : previewText(document);
  return fileOutput(request, response, document, comment, summary, options);
}

export function createErrorDetails(path: string, message: string): OcrToolDetails {
  return {
    path,
    filename: "",
    purpose: DEFAULT_OCR_PURPOSE,
    pageCount: 0,
    summary: "",
    error: message,
  };
}
