import type { AgentToolUpdateCallback } from "@earendil-works/pi-coding-agent";
import { Check } from "typebox/value";
import { describe, expect, it, vi } from "vitest";

import { fetchDeepSeek } from "../src/client";
import { prepareFetchOutput } from "../src/output";
import { DS_FETCH_OUTPUT_SCHEMA } from "../src/schemas";
import { createDsFetchTool } from "../src/tool";
import type { FetchToolDetails } from "../src/types";
import {
  hostCast,
  makeContext,
  makeDeps,
  makeFetchResponse,
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
  const response = makeFetchResponse();
  const onUpdate = vi.fn<AgentToolUpdateCallback<FetchToolDetails>>();
  const fetchMock = vi.fn<typeof fetchDeepSeek>((_request, _apiKey, options) => {
    options?.onRetry?.(RETRY_EVENT);
    return Promise.resolve(response);
  });
  const prepareMock = vi.fn<typeof prepareFetchOutput>(() =>
    Promise.resolve(makePrepared(response)),
  );
  const tool = createDsFetchTool(makeDeps({ fetch: fetchMock, prepare: prepareMock }));
  const { registry } = makeRegistry();

  const result = await tool.execute(
    "call-retry",
    { url: "https://example.com/article" },
    undefined,
    onUpdate,
    makeContext(registry),
  );
  expect(result.isError).not.toBe(true);
  expect(onUpdate).toHaveBeenCalledWith({
    content: [{ type: "text", text: "Retrying (1/2) after HTTP 429..." }],
    details: {
      url: "https://example.com/article",
      title: "",
      summary: "",
      retry: { attempt: 1, maxRetries: 2, status: 429 },
    },
    structuredContent: { title: "", content: "" },
  });
  expect(Check(DS_FETCH_OUTPUT_SCHEMA, onUpdate.mock.calls[0]?.[0]?.structuredContent)).toBe(true);

  const partial = hostCast<unknown>(onUpdate.mock.calls[0]?.[0]);
  const component = renderResult(tool, partial, { expanded: false, isPartial: true }, plainTheme());
  expect(renderText(component)).toContain("Retrying (1/2) after HTTP 429...");
}

async function ignoresRetryEventsWithoutAnUpdateCallback() {
  const response = makeFetchResponse();
  const fetchMock = vi.fn<typeof fetchDeepSeek>((_request, _apiKey, options) => {
    options?.onRetry?.(RETRY_EVENT);
    return Promise.resolve(response);
  });
  const prepareMock = vi.fn<typeof prepareFetchOutput>(() =>
    Promise.resolve(makePrepared(response)),
  );
  const tool = createDsFetchTool(makeDeps({ fetch: fetchMock, prepare: prepareMock }));
  const { registry } = makeRegistry();

  const result = await tool.execute(
    "call-no-update",
    { url: "https://example.com/article" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toEqual(response);
}

describe("ds_fetch retry progress", () => {
  it("emits schema-valid partial results and renders retry details", emitsAndRendersRetryProgress);
  it(
    "ignores retry events when no update callback is available",
    ignoresRetryEventsWithoutAnUpdateCallback,
  );
});
