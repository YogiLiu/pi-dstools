import { DeepSeekToolError } from "@pi-dstools/deepseek";
import { Check } from "typebox/value";
import { describe, expect, it, vi } from "vitest";

import { ocrDeepSeek } from "../src/client";
import { EMPTY_STRUCTURED_CONTENT, createErrorDetails, prepareOcrOutput } from "../src/output";
import { DS_OCR_OUTPUT_SCHEMA, DS_OCR_PARAMS } from "../src/schemas";
import { createDsOcrTool, isOcrToolDetails, sanitizeDetails } from "../src/tool";
import {
  detailsOf,
  firstText,
  hostCast,
  makeContext,
  makeDeps,
  makeDetails,
  makeOcrResponse,
  makePrepared,
  makeRegistry,
} from "./helpers";

const EMPTY = EMPTY_STRUCTURED_CONTENT;

function registersFullToolDefinition() {
  const tool = createDsOcrTool();
  expect(tool.name).toBe("ds_ocr");
  expect(tool.label).toBe("DeepSeek OCR");
  expect(tool.defaultActive).toBe(true);
  expect(tool.parameters).toBe(DS_OCR_PARAMS);
  expect(tool.outputSchema).toBe(DS_OCR_OUTPUT_SCHEMA);
  expect(tool.description).toContain("temporary Markdown");
  expect(tool.description).toContain("untrusted");
  expect(tool.promptSnippet).toContain("DeepSeek OCR");
  expect(tool.promptGuidelines?.join("\n")).toContain("ds_ocr");
  expect(tool.promptGuidelines?.join("\n")).toContain("read");
  expect(tool.promptGuidelines?.join("\n")).toContain("Line values");
  expect(tool.promptGuidelines?.join("\n")).toContain("Total Lines");
  expect(JSON.stringify(tool.parameters)).toContain("path");
  expect(JSON.stringify(tool.parameters)).toContain("purpose");
}

function validatesRawResponseAgainstOutputSchema() {
  expect(Check(DS_OCR_OUTPUT_SCHEMA, makeOcrResponse())).toBe(true);
  expect(Check(DS_OCR_OUTPUT_SCHEMA, EMPTY)).toBe(true);
  expect(Check(DS_OCR_OUTPUT_SCHEMA, null)).toBe(false);
  expect(Check(DS_OCR_OUTPUT_SCHEMA, { ...makeOcrResponse(), object: "other" })).toBe(false);
}

async function usesDefaultRuntimeForInvalidParams() {
  const tool = createDsOcrTool();
  const { registry } = makeRegistry();
  const result = await tool.execute(
    "call-invalid-default",
    hostCast({ path: 42 }),
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).toBe(true);
  expect(firstText(result)).toContain("path must be a string");
  expect(result.structuredContent).toEqual(EMPTY);
}

async function returnsFormattedContentAndStableDetails() {
  const response = makeOcrResponse();
  const fetchMock = vi.fn<typeof ocrDeepSeek>(() => Promise.resolve(response));
  const prepareMock = vi.fn<typeof prepareOcrOutput>(() => Promise.resolve(makePrepared(response)));
  const { registry } = makeRegistry();
  const tool = createDsOcrTool(makeDeps({ fetch: fetchMock, prepare: prepareMock }));
  const result = await tool.execute(
    "call-success",
    { path: "doc.pdf" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(firstText(result)).toBe("formatted OCR result");
  expect(result.details).toMatchObject({ path: "/workspace/doc.pdf" });
  expect(result.structuredContent).toEqual(response);
  expect(Check(DS_OCR_OUTPUT_SCHEMA, result.structuredContent)).toBe(true);
  expect(result.isError).not.toBe(true);
  expect(JSON.stringify(result)).not.toContain("resolved-key");
  const request = fetchMock.mock.calls[0]?.[0];
  expect(request?.path).toContain("doc.pdf");
  expect(request?.filename).toBe("doc.pdf");
  expect(request?.purpose).toBe("text_recognition");
}

async function mapsMissingCredentialsToErrorResult() {
  const { registry } = makeRegistry({ auth: "unresolved" });
  const fetchMock = vi.fn<typeof ocrDeepSeek>(() => Promise.resolve(makeOcrResponse()));
  const tool = createDsOcrTool(makeDeps({ fetch: fetchMock }));
  const result = await tool.execute(
    "call-no-credentials",
    { path: "doc.pdf" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toEqual(EMPTY);
  expect(firstText(result)).toContain("installed but unavailable");
  expect(detailsOf(result).error).toContain("Pi did not resolve credentials");
  expect(fetchMock).not.toHaveBeenCalled();
}

async function mapsClientErrorsToErrorResult() {
  const fetchMock = vi.fn<typeof ocrDeepSeek>(() =>
    Promise.reject(new DeepSeekToolError("provider unavailable", "network")),
  );
  const { registry } = makeRegistry();
  const tool = createDsOcrTool(makeDeps({ fetch: fetchMock }));
  const result = await tool.execute(
    "call-client-error",
    { path: "doc.pdf" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toEqual(EMPTY);
  expect(firstText(result)).toBe("provider unavailable");
  expect(detailsOf(result).error).toBe("provider unavailable");
}

function validatesDetails() {
  const details = makeDetails();
  expect(isOcrToolDetails(details)).toBe(true);
  expect(isOcrToolDetails(makeDetails({ contentPath: "/tmp/pages.md" }))).toBe(true);
  const malformed: readonly unknown[] = [
    null,
    {},
    { ...details, path: 42 },
    { ...details, filename: 42 },
    { ...details, purpose: 42 },
    { ...details, pageCount: "1" },
    { ...details, summary: 42 },
    { ...details, contentPath: 42 },
  ];
  for (const value of malformed) {
    expect(isOcrToolDetails(value)).toBe(false);
  }
  expect(sanitizeDetails()).toEqual(createErrorDetails("", "No OCR details available."));
  expect(sanitizeDetails(details)).toBe(details);
}

describe("ds_ocr tool definition and schema", () => {
  it("registers the full tool definition", registersFullToolDefinition);
  it("validates raw OCR responses against outputSchema", validatesRawResponseAgainstOutputSchema);
});

describe("ds_ocr execution", () => {
  it("uses the default runtime and rejects invalid params", usesDefaultRuntimeForInvalidParams);
  it("returns formatted content and stable details", returnsFormattedContentAndStableDetails);
  it("maps missing credentials to an isError result", mapsMissingCredentialsToErrorResult);
  it("maps client errors to an isError result", mapsClientErrorsToErrorResult);
  it("validates and sanitizes tool details", validatesDetails);
});
