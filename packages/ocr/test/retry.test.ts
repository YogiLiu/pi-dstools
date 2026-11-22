import type { AgentToolUpdateCallback } from "@earendil-works/pi-coding-agent";
import { Check } from "typebox/value";
import { describe, expect, it, vi } from "vitest";

import { ocrDeepSeek } from "../src/client";
import { EMPTY_STRUCTURED_CONTENT } from "../src/output";
import { DS_OCR_OUTPUT_SCHEMA } from "../src/schemas";
import { createDsOcrTool } from "../src/tool";
import type { OcrToolDetails } from "../src/types";
import {
  hostCast,
  makeContext,
  makeDeps,
  makeOcrResponse,
  makePrepared,
  makeRegistry,
  plainTheme,
  renderResult,
  renderText,
} from "./helpers";

const RETRY_EVENT = {
  attempt: 1,
  maxRetries: 2,
  status: 429,
  delayMs: 500,
} as const;

async function emitsAndRendersRetryProgress() {
  const response = makeOcrResponse();
  const onUpdate = vi.fn<AgentToolUpdateCallback<OcrToolDetails>>();
  const fetchMock = vi.fn<typeof ocrDeepSeek>((_request, _apiKey, options) => {
    options?.onRetry?.(RETRY_EVENT);
    return Promise.resolve(response);
  });
  const prepareMock = vi.fn<typeof import("../src/output").prepareOcrOutput>(() =>
    Promise.resolve(makePrepared(response)),
  );
  const tool = createDsOcrTool(makeDeps({ fetch: fetchMock, prepare: prepareMock }));
  const { registry } = makeRegistry();

  const result = await tool.execute(
    "call-retry",
    { path: "doc.pdf" },
    undefined,
    onUpdate,
    makeContext(registry),
  );
  expect(result.isError).not.toBe(true);
  expect(onUpdate).toHaveBeenCalledWith({
    content: [{ type: "text", text: "Retrying (1/2) after HTTP 429..." }],
    details: {
      path: "doc.pdf",
      filename: "",
      purpose: "text_recognition",
      pageCount: 0,
      summary: "",
      retry: { attempt: 1, maxRetries: 2, status: 429 },
    },
    structuredContent: EMPTY_STRUCTURED_CONTENT,
  });
  expect(Check(DS_OCR_OUTPUT_SCHEMA, onUpdate.mock.calls[0]?.[0]?.structuredContent)).toBe(true);

  const partial = hostCast<unknown>(onUpdate.mock.calls[0]?.[0]);
  const component = renderResult(tool, partial, { expanded: false, isPartial: true }, plainTheme());
  expect(renderText(component)).toContain("Retrying (1/2) after HTTP 429...");
}

async function ignoresRetryEventsWithoutAnUpdateCallback() {
  const response = makeOcrResponse();
  const fetchMock = vi.fn<typeof ocrDeepSeek>((_request, _apiKey, options) => {
    options?.onRetry?.(RETRY_EVENT);
    return Promise.resolve(response);
  });
  const prepareMock = vi.fn<typeof import("../src/output").prepareOcrOutput>(() =>
    Promise.resolve(makePrepared(response)),
  );
  const tool = createDsOcrTool(makeDeps({ fetch: fetchMock, prepare: prepareMock }));
  const { registry } = makeRegistry();

  const result = await tool.execute(
    "call-no-update",
    { path: "doc.pdf" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toEqual(response);
}

describe("ds_ocr retry progress", () => {
  it("emits schema-valid partial results and renders retry details", emitsAndRendersRetryProgress);
  it(
    "ignores retry events when no update callback is available",
    ignoresRetryEventsWithoutAnUpdateCallback,
  );
});
