import { Markdown, setCapabilityOverrides, Text } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";

import { formatOcrForTui } from "../src/format";
import { EMPTY_STRUCTURED_CONTENT, createErrorDetails } from "../src/output";
import { createDsOcrTool } from "../src/tool";
import {
  hostCast,
  makeDetails,
  makeOcrResponse,
  plainTheme,
  renderCall,
  renderResult,
  renderText,
} from "./helpers";

const CONTENT_PATH = "/tmp/pi-dstools/ocr/uuid/pages.md";

function formatsFilenameMetadataPathsAndContent() {
  const details = makeDetails({
    filename: "A [bold] \\ doc.pdf",
    purpose: "rich_layout_recognition",
    pageCount: 2,
    contentPath: CONTENT_PATH,
    summary: "ignored",
  });
  expect(formatOcrForTui(details)).toBe(
    ["A \\[bold\\] \\\\ doc.pdf", "Pages: 2 | Purpose: rich_layout_recognition", CONTENT_PATH].join(
      "\n",
    ),
  );
  expect(formatOcrForTui(makeDetails({ filename: "", pageCount: 0, summary: "" }))).toBe(
    ["Untitled document", "Pages: 0 | Purpose: text_recognition", "OCR result is empty."].join(
      "\n",
    ),
  );
  const sanitized = formatOcrForTui(
    makeDetails({ filename: "T\u0001itle", summary: "S\u0003ummary" }),
  );
  expect(sanitized).toContain("T itle");
  expect(sanitized).toContain("S ummary");
}

function rendersCallComponent() {
  const tool = createDsOcrTool();
  const component = renderCall(tool, { path: "/workspace/doc.pdf" }, plainTheme());
  expect(component).toBeInstanceOf(Text);
  expect(renderText(component)).toContain('ds_ocr "/workspace/doc.pdf"');

  const longPath = `/workspace/${"x".repeat(100)}.pdf`;
  const truncated = renderCall(tool, { path: longPath }, plainTheme());
  expect(renderText(truncated)).toContain(`"${longPath.slice(0, 77)}..."`);

  const malformed = renderCall(tool, hostCast({ path: 42 }), plainTheme());
  expect(renderText(malformed)).toContain('ds_ocr ""');
}

function rendersFinalMarkdownStates() {
  setCapabilityOverrides({ hyperlinks: false });
  const tool = createDsOcrTool();
  const fileResult = {
    content: [{ type: "text", text: "ignored" }],
    details: makeDetails({ contentPath: CONTENT_PATH, summary: "ignored" }),
    structuredContent: makeOcrResponse(),
  };
  const fileComponent = renderResult(
    tool,
    fileResult,
    { expanded: false, isPartial: false },
    plainTheme(),
  );
  expect(fileComponent).toBeInstanceOf(Markdown);
  expect(renderText(fileComponent)).toContain("doc.pdf");
  expect(renderText(fileComponent)).toContain(CONTENT_PATH);
  expect(renderText(fileComponent)).not.toContain("ignored");

  const inlineResult = {
    content: [{ type: "text", text: "ignored" }],
    details: makeDetails({ summary: "Hello" }),
    structuredContent: makeOcrResponse(),
  };
  const inlineComponent = renderResult(
    tool,
    inlineResult,
    { expanded: true, isPartial: false },
    plainTheme(),
  );
  expect(inlineComponent).toBeInstanceOf(Markdown);
  expect(renderText(inlineComponent)).toContain("Hello");
}

function rendersErrorAndMalformedDetails() {
  const tool = createDsOcrTool();
  const error = renderResult(
    tool,
    {
      content: [],
      details: createErrorDetails("bad.pdf", "failed"),
      structuredContent: EMPTY_STRUCTURED_CONTENT,
      isError: true,
    },
    { expanded: false, isPartial: false },
    plainTheme(),
  );
  expect(error).toBeInstanceOf(Text);
  expect(renderText(error)).toContain("Error: failed");

  const malformed = renderResult(
    tool,
    {
      content: [],
      details: hostCast({ unexpected: true }),
      structuredContent: makeOcrResponse(),
    },
    { expanded: false, isPartial: false },
    plainTheme(),
  );
  expect(malformed).toBeInstanceOf(Text);
  expect(renderText(malformed)).toContain("Error: No OCR details available.");
}

function rendersPartialStates() {
  const tool = createDsOcrTool();
  const retry = renderResult(
    tool,
    {
      content: [],
      details: makeDetails({ summary: "", retry: { attempt: 1, maxRetries: 2, status: 429 } }),
      structuredContent: EMPTY_STRUCTURED_CONTENT,
    },
    { expanded: false, isPartial: true },
    plainTheme(),
  );
  expect(renderText(retry)).toContain("Retrying (1/2) after HTTP 429...");

  const partial = renderResult(
    tool,
    { content: [], details: makeDetails(), structuredContent: EMPTY_STRUCTURED_CONTENT },
    { expanded: false, isPartial: true },
    plainTheme(),
  );
  expect(renderText(partial)).toContain("Recognizing...");

  const malformed = renderResult(
    tool,
    {
      content: [],
      details: hostCast({ unexpected: true }),
      structuredContent: EMPTY_STRUCTURED_CONTENT,
    },
    { expanded: false, isPartial: true },
    plainTheme(),
  );
  expect(renderText(malformed)).toContain("Recognizing...");
}

describe("ds_ocr pi-tui renderers", () => {
  it("formats filenames, metadata, paths, and content", formatsFilenameMetadataPathsAndContent);
  it("renders calls", rendersCallComponent);
  it("renders final Markdown states", rendersFinalMarkdownStates);
  it("renders error and malformed details", rendersErrorAndMalformedDetails);
  it("renders partial states", rendersPartialStates);
});
