import { join } from "node:path";

import {
  contentDirectory,
  displayContent,
  displayText,
  resolveContentOptions,
  splitContentLines,
  unicodeLength,
  writeContentFiles,
  type ContentOptions,
} from "@pi-dstools/deepseek";

import { extractHeadings, formatHeadingTable } from "./headings";
import type {
  DeepSeekFetchResponse,
  FetchToolDetails,
  NormalizedFetchRequest,
  PreparedFetchOutput,
} from "./types";

export const PREVIEW_LENGTH = 300;
export const PREVIEW_COMMENT = `<!-- The following is a preview of the first ${PREVIEW_LENGTH} characters -->`;
export const FULL_CONTENT_COMMENT = "<!-- The following is the full content -->";
export const EMPTY_CONTENT_COMMENT = "<!-- Page content is empty -->";
export const TABLE_OF_CONTENTS_COMMENT = "<!-- Table of contents -->";

function previewText(sanitized: string): string {
  const characters = Array.from(sanitized);
  if (characters.length <= PREVIEW_LENGTH) return sanitized;
  return `${characters.slice(0, PREVIEW_LENGTH).join("")}...`;
}

interface FullContentFile {
  readonly path: string;
  readonly totalLines: number;
}

function buildContentText(
  title: string,
  url: string,
  file: FullContentFile | undefined,
  comment: string,
  body: string,
): string {
  const lines = ["---", `Title: ${displayText(title)}`, `URL: ${displayText(url)}`];
  if (file !== undefined) {
    lines.push(`Full Content: ${file.path}`, `Total Lines: ${file.totalLines}`);
  }
  lines.push("---", "", comment, "");
  if (body.length > 0) lines.push(body);
  return lines.join("\n");
}

function inlineOutput(
  request: NormalizedFetchRequest,
  response: DeepSeekFetchResponse,
  comment: string,
  body: string,
  summary: string,
): PreparedFetchOutput {
  return {
    contentText: buildContentText(response.title, request.url, undefined, comment, body),
    details: { url: request.url, title: response.title, summary },
    structuredContent: response,
  };
}

async function fileOutput(
  request: NormalizedFetchRequest,
  response: DeepSeekFetchResponse,
  comment: string,
  summary: string,
  options: ContentOptions,
): Promise<PreparedFetchOutput> {
  const { makeTempDir, makeUuid, fileSystem } = resolveContentOptions(options);
  const directory = contentDirectory(makeTempDir(), "fetch", makeUuid());
  const file: FullContentFile = {
    path: join(directory, "page.md"),
    totalLines: splitContentLines(response.content).length,
  };
  await writeContentFiles(
    fileSystem,
    directory,
    [{ path: file.path, content: response.content }],
    "Failed to save DeepSeek fetched page content",
  );
  return {
    contentText: buildContentText(response.title, request.url, file, comment, summary),
    details: { url: request.url, title: response.title, contentPath: file.path, summary },
    structuredContent: response,
  };
}

export async function prepareFetchOutput(
  request: NormalizedFetchRequest,
  response: DeepSeekFetchResponse,
  options: ContentOptions = {},
): Promise<PreparedFetchOutput> {
  const sanitized = displayContent(response.content);
  if (response.content.trim().length === 0) {
    return inlineOutput(request, response, EMPTY_CONTENT_COMMENT, "", "");
  }
  if (unicodeLength(response.content) <= PREVIEW_LENGTH) {
    return inlineOutput(request, response, FULL_CONTENT_COMMENT, sanitized, sanitized);
  }

  const headings = extractHeadings(response.content);
  const comment = headings.length > 0 ? TABLE_OF_CONTENTS_COMMENT : PREVIEW_COMMENT;
  const summary = headings.length > 0 ? formatHeadingTable(headings) : previewText(sanitized);
  const prepared = await fileOutput(request, response, comment, summary, options);
  return prepared;
}

export function createErrorDetails(url: string, message: string): FetchToolDetails {
  return {
    url,
    title: "",
    summary: "",
    error: message,
  };
}
