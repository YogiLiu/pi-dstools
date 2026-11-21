import { DEEPSEEK_SEARCH_URL, type DeepSeekFetch } from "@pi-dstools/deepseek";
import { describe, expect, it, vi } from "vitest";

import { normalizeSearchInput, searchDeepSeek } from "../src/client";
import {
  fetchOnce,
  firstCall,
  hostCast,
  httpFailure,
  instantSleep,
  jsonResponse,
  makeResult,
  messageOf,
  rejectedError,
  requestBody,
  throwNonError,
} from "./helpers";

function rejectsNonRecordInputAndRuntimeFields() {
  expect(() => normalizeSearchInput(hostCast(null))).toThrow(/query must be a string/u);
  expect(() => normalizeSearchInput(hostCast({ query: 42 }))).toThrow(/query must be a string/u);
  expect(() => normalizeSearchInput(hostCast({ query: "ok", ori_question: 42 }))).toThrow(
    /ori_question must be a string or null/u,
  );
  expect(() => normalizeSearchInput(hostCast({ query: "ok", localization: 42 }))).toThrow(
    /localization must be a string/u,
  );
}

function omitsBlankLocalizationAndRejectsBlankQuestions() {
  expect(
    normalizeSearchInput({ query: "DeepSeek", localization: "   ", ori_question: null }),
  ).toEqual({ query: "DeepSeek", count: 10, need_content: false });
  expect(() => normalizeSearchInput({ query: "ok", ori_question: "   " })).toThrow(/ori_question/u);
}

async function rejectsMalformedPayloadsAndFields() {
  const invalidPayloads: unknown[] = [null, { results: "not an array" }, { results: [null] }];
  await Promise.all(
    invalidPayloads.map(async (payload) => {
      await expect(
        searchDeepSeek({ query: "DeepSeek" }, "key", {
          fetchImpl: fetchOnce(jsonResponse(payload)),
        }),
      ).rejects.toMatchObject({ kind: "response" });
    }),
  );

  const invalidResults: unknown[] = [
    { ...makeResult(), title: 42 },
    { ...makeResult(), site_name: 42 },
    { ...makeResult(), rerank_score: Number.NaN },
    { ...makeResult(), authority: Number.POSITIVE_INFINITY },
  ];
  await Promise.all(
    invalidResults.map(async (result) => {
      await expect(
        searchDeepSeek({ query: "DeepSeek" }, "key", {
          fetchImpl: fetchOnce(jsonResponse({ results: [result] })),
        }),
      ).rejects.toMatchObject({ kind: "response" });
    }),
  );
}

async function normalizesNullableFieldsToNull() {
  const missingSiteName = { ...makeResult(), site_name: undefined };
  const nullMetadata = { ...makeResult(), site_icon: null, date: null };
  await expect(
    searchDeepSeek({ query: "DeepSeek" }, "key", {
      fetchImpl: fetchOnce(jsonResponse({ results: [missingSiteName, nullMetadata] })),
    }),
  ).resolves.toMatchObject({
    results: [{ site_name: null }, { site_icon: null, date: null }],
  });
}

async function usesBareStatusWhenBodyCannotBeRead() {
  await expect(
    searchDeepSeek({ query: "DeepSeek" }, "key", {
      fetchImpl: fetchOnce(httpFailure({ statusText: "", failText: true })),
      sleep: instantSleep(),
    }),
  ).rejects.toThrow(/^DeepSeek Search API returned HTTP 500$/u);
}

async function omitsDetailForBodiesWithoutProviderMessage() {
  await expect(
    searchDeepSeek({ query: "DeepSeek" }, "key", {
      fetchImpl: fetchOnce(httpFailure({ body: "{}" })),
      sleep: instantSleep(),
    }),
  ).rejects.toThrow(/^DeepSeek Search API returned HTTP 500 Error$/u);
}

async function usesRawNonJsonBodiesAsDetails() {
  await expect(
    searchDeepSeek({ query: "DeepSeek" }, "key", {
      fetchImpl: fetchOnce(httpFailure({ body: "provider said no" })),
      sleep: instantSleep(),
    }),
  ).rejects.toThrow(/^DeepSeek Search API returned HTTP 500 Error: provider said no$/u);
}

async function truncatesLongProviderMessages() {
  const body = JSON.stringify({ error: { message: "x".repeat(600) } });
  const error = await rejectedError(
    searchDeepSeek({ query: "DeepSeek" }, "key", {
      fetchImpl: fetchOnce(httpFailure({ body })),
      sleep: instantSleep(),
    }),
  );
  const message = messageOf(error);
  expect(message).toContain(`HTTP 500 Error: ${"x".repeat(500)}`);
  expect(message).not.toContain("x".repeat(501));
}

async function usesGlobalFetchWhenNoClientIsInjected() {
  const fetchMock = vi.fn<DeepSeekFetch>((_url, _init) =>
    Promise.resolve(jsonResponse({ results: [] })),
  );
  vi.stubGlobal("fetch", fetchMock);
  try {
    await expect(searchDeepSeek({ query: "DeepSeek" }, "key")).resolves.toEqual({ results: [] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, rawInit] = firstCall(fetchMock);
    expect(url).toBe(DEEPSEEK_SEARCH_URL);
    expect(requestBody(rawInit)).toMatchObject({ query: "DeepSeek" });
  } finally {
    vi.unstubAllGlobals();
  }
}

async function normalizesNonErrorNetworkFailures() {
  const failure = { toString: () => "network down" };
  const fetchImpl = vi.fn<DeepSeekFetch>((_url, _init) => {
    throwNonError(failure);
  });
  await expect(searchDeepSeek({ query: "DeepSeek" }, "key", { fetchImpl })).rejects.toThrow(
    /DeepSeek Search request failed: network down/u,
  );
}

describe("runtime input and provider response validation", () => {
  it(
    "rejects non-record input and non-string runtime fields",
    rejectsNonRecordInputAndRuntimeFields,
  );
  it(
    "omits blank localization and rejects blank original questions",
    omitsBlankLocalizationAndRejectsBlankQuestions,
  );
  it(
    "rejects malformed payloads, entries, and invalid result fields",
    rejectsMalformedPayloadsAndFields,
  );
  it("normalizes omitted and null nullable fields to null", normalizesNullableFieldsToNull);
});

describe("provider error messages", () => {
  it("uses a bare status when the error body cannot be read", usesBareStatusWhenBodyCannotBeRead);
  it(
    "omits a detail for JSON bodies without a provider message",
    omitsDetailForBodiesWithoutProviderMessage,
  );
  it("uses raw non-JSON response bodies as details", usesRawNonJsonBodiesAsDetails);
  it("truncates long provider messages", truncatesLongProviderMessages);
});

describe("default client behavior", () => {
  it(
    "uses globalThis.fetch and posts the normalized request when no client is injected",
    usesGlobalFetchWhenNoClientIsInjected,
  );
  it(
    "normalizes non-Error network failures into a readable message",
    normalizesNonErrorNetworkFailures,
  );
});
