import type { AgentToolUpdateCallback } from "@earendil-works/pi-coding-agent";
import { describe, expect, it, vi } from "vitest";

import { searchDeepSeek } from "../src/client";
import { createDsSearchTool } from "../src/tool";
import type { SearchToolDetails } from "../src/types";
import {
  hostCast,
  makeContext,
  makeDeps,
  makeRegistry,
  makeResult,
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
  const results = [makeResult()];
  const onUpdate = vi.fn<AgentToolUpdateCallback<SearchToolDetails>>();
  const searchMock = vi.fn<typeof searchDeepSeek>((_request, _apiKey, options) => {
    options?.onRetry?.(RETRY_EVENT);
    return Promise.resolve({ results });
  });
  const tool = createDsSearchTool(makeDeps({ search: searchMock }));
  const { registry } = makeRegistry();

  const result = await tool.execute(
    "call-retry",
    { query: "DeepSeek" },
    undefined,
    onUpdate,
    makeContext(registry),
  );
  expect(result.isError).not.toBe(true);
  expect(onUpdate).toHaveBeenCalledWith({
    content: [{ type: "text", text: "Retrying (1/2) after HTTP 429..." }],
    details: {
      query: "DeepSeek",
      resultCount: 0,
      results: [],
      retry: { attempt: 1, maxRetries: 2, status: 429 },
    },
    structuredContent: [],
  });

  const partial = hostCast<unknown>(onUpdate.mock.calls[0]?.[0]);
  const component = renderResult(tool, partial, { expanded: false, isPartial: true }, plainTheme());
  expect(renderText(component)).toContain("Retrying (1/2) after HTTP 429...");
}

async function ignoresRetryEventsWithoutAnUpdateCallback() {
  const searchMock = vi.fn<typeof searchDeepSeek>((_request, _apiKey, options) => {
    options?.onRetry?.(RETRY_EVENT);
    return Promise.resolve({ results: [] });
  });
  const tool = createDsSearchTool(makeDeps({ search: searchMock }));
  const { registry } = makeRegistry();

  const result = await tool.execute(
    "call-no-update",
    { query: "DeepSeek" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).not.toBe(true);
  expect(result.structuredContent).toEqual([]);
}

describe("ds_search retry progress", () => {
  it("emits schema-valid partial results and renders retry details", emitsAndRendersRetryProgress);
  it(
    "ignores retry events when no update callback is available",
    ignoresRetryEventsWithoutAnUpdateCallback,
  );
});
