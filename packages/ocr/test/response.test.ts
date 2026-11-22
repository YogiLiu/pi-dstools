import { describe, expect, it } from "vitest";

import { ocrDeepSeek } from "../src/client";
import {
  fakeOcrFileSystem,
  fetchOnce,
  jsonResponse,
  makeOcrResponse,
  makeRequest,
  messageOf,
  rejectedError,
} from "./helpers";

const REQUEST = makeRequest();

async function parsesValidResponseAndRejectsEmbeddedError() {
  const { fs } = fakeOcrFileSystem();
  const response = makeOcrResponse({
    purpose: "rich_layout_recognition",
    page_count: 2,
    pages: [
      { index: 0, text: "First", finish_reason: "stop" },
      { index: 1, text: "Second", finish_reason: "length" },
    ],
  });
  await expect(
    ocrDeepSeek(makeRequest({ purpose: "rich_layout_recognition" }), "key", {
      fileSystem: fs,
      fetchImpl: fetchOnce(jsonResponse(response)),
    }),
  ).resolves.toEqual(response);

  const embedded = await rejectedError(
    ocrDeepSeek(REQUEST, "key", {
      fileSystem: fs,
      fetchImpl: fetchOnce(jsonResponse({ error: { message: "OCR did not finish in time" } })),
    }),
  );
  expect(embedded).toMatchObject({ kind: "response" });
  expect(messageOf(embedded)).toContain("OCR did not finish in time");
}

async function rejectsInvalidResponses() {
  const valid = makeOcrResponse();
  const invalid: readonly unknown[] = [
    null,
    [],
    { ...valid, pages: null },
    { ...valid, usage: null },
    { ...valid, object: "other" },
    { ...valid, object: 42 },
    { ...valid, purpose: "other" },
    { ...valid, purpose: 42 },
    { ...valid, id: 42 },
    { ...valid, created: "x" },
    { ...valid, created: 1.5 },
    { ...valid, page_count: 2 },
    { ...valid, pages: [null] },
    { ...valid, pages: [{ index: 0, text: "A", finish_reason: "other" }] },
    { ...valid, pages: [{ index: 0, text: "A", finish_reason: 42 }] },
    { ...valid, pages: [{ index: 0.5, text: "A", finish_reason: "stop" }] },
    { ...valid, pages: [{ index: 0, text: 42, finish_reason: "stop" }] },
    { ...valid, usage: { input_tokens: 1.5, output_tokens: 5, total_tokens: 15 } },
    { ...valid, error: { message: "failed" } },
  ];
  await Promise.all(
    invalid.map(async (payload) => {
      const error = await rejectedError(
        ocrDeepSeek(REQUEST, "key", {
          fileSystem: fakeOcrFileSystem().fs,
          fetchImpl: fetchOnce(jsonResponse(payload)),
        }),
      );
      expect(error).toMatchObject({ kind: "response" });
    }),
  );
}

async function acceptsIgnoredEmbeddedErrorFields() {
  const valid = makeOcrResponse();
  const payloads: readonly unknown[] = [
    { ...valid, error: null },
    { ...valid, error: { message: 42 } },
  ];
  await Promise.all(
    payloads.map(async (payload) => {
      await expect(
        ocrDeepSeek(REQUEST, "key", {
          fileSystem: fakeOcrFileSystem().fs,
          fetchImpl: fetchOnce(jsonResponse(payload)),
        }),
      ).resolves.toEqual(valid);
    }),
  );
}

describe("OCR response parsing", () => {
  it(
    "parses valid responses and rejects embedded errors",
    parsesValidResponseAndRejectsEmbeddedError,
  );
  it("rejects invalid responses", rejectsInvalidResponses);
  it("accepts ignored embedded error fields", acceptsIgnoredEmbeddedErrorFields);
});
