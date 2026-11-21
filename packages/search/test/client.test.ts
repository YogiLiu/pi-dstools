import { DEEPSEEK_SEARCH_URL, type HttpResponse } from "@pi-dstools/deepseek";
import { describe, expect, it } from "vitest";

import { normalizeSearchInput, searchDeepSeek } from "../src/client";
import {
  errorResponse,
  fetchInit,
  fetchOnce,
  firstCall,
  hostCast,
  instantSleep,
  jsonResponse,
  makeResult,
  rejectedError,
  requestBody,
} from "./helpers";

function appliesApiDefaults() {
  expect(normalizeSearchInput({ query: "DeepSeek" })).toEqual({
    query: "DeepSeek",
    count: 10,
    need_content: false,
  });
}

async function validatesUnicodeAndFields() {
  await expect(searchDeepSeek({ query: "   " }, "key")).rejects.toMatchObject({
    kind: "validation",
  });
  await expect(searchDeepSeek({ query: "𐍈".repeat(129) }, "key")).rejects.toMatchObject({
    kind: "validation",
  });
  await expect(searchDeepSeek({ query: "ok", count: 0 }, "key")).rejects.toMatchObject({
    kind: "validation",
  });
  await expect(searchDeepSeek({ query: "ok", count: 51 }, "key")).rejects.toMatchObject({
    kind: "validation",
  });
  await expect(
    searchDeepSeek({ query: "ok", ori_question: "𐍈".repeat(129) }, "key"),
  ).rejects.toMatchObject({ kind: "validation" });
  await expect(
    searchDeepSeek({ query: "ok", localization: "not-an-ip" }, "key"),
  ).rejects.toMatchObject({ kind: "validation" });
  await expect(
    searchDeepSeek(hostCast({ query: "ok", need_content: "yes" }), "key"),
  ).rejects.toMatchObject({ kind: "validation" });
}

function acceptsNullQuestionAndIpv6() {
  const request = normalizeSearchInput({
    query: "DeepSeek",
    ori_question: null,
    localization: "2001:db8::1",
  });
  expect(request).toEqual({
    query: "DeepSeek",
    count: 10,
    need_content: false,
    localization: "2001:db8::1",
  });
}

async function postsFullNormalizedRequest() {
  const result = makeResult();
  const fetchImpl = fetchOnce(jsonResponse({ results: [result] }));
  await searchDeepSeek(
    {
      query: "DeepSeek site:github.com",
      count: 5,
      ori_question: "What is new?",
      localization: "1.2.3.4",
      need_content: true,
    },
    "secret-key",
    { fetchImpl },
  );

  const [url, rawInit] = firstCall(fetchImpl);
  const init = fetchInit(rawInit);
  expect(url).toBe(DEEPSEEK_SEARCH_URL);
  expect(init.method).toBe("POST");
  expect(init.headers).toEqual({
    Authorization: "Bearer secret-key",
    "Content-Type": "application/json",
  });
  expect(requestBody(init)).toEqual({
    query: "DeepSeek site:github.com",
    count: 5,
    need_content: true,
    ori_question: "What is new?",
    localization: "1.2.3.4",
  });
}

async function passesAbortSignalToFetch() {
  const controller = new AbortController();
  const fetchImpl = fetchOnce(jsonResponse({ results: [] }));
  await searchDeepSeek({ query: "DeepSeek" }, "key", { signal: controller.signal, fetchImpl });
  const [, rawInit] = firstCall(fetchImpl);
  expect(fetchInit(rawInit).signal).toBe(controller.signal);
}

async function returnsEmptyResults() {
  const fetchImpl = fetchOnce(jsonResponse({ results: [] }));
  await expect(searchDeepSeek({ query: "nothing" }, "key", { fetchImpl })).resolves.toEqual({
    results: [],
  });
}

async function mapsHttpErrorsWithoutLeakingTheKey() {
  const statuses = [400, 401, 402, 429, 500, 504];
  await Promise.all(
    statuses.map(async (status) => {
      const fetchImpl = fetchOnce(errorResponse(status, "provider error"));
      await expect(
        searchDeepSeek({ query: "DeepSeek" }, "secret-key", {
          fetchImpl,
          sleep: instantSleep(),
        }),
      ).rejects.toMatchObject({ kind: "http", status });
    }),
  );

  const fetchImpl = fetchOnce(errorResponse(401, "bad key"));
  await expect(searchDeepSeek({ query: "DeepSeek" }, "secret-key", { fetchImpl })).rejects.toThrow(
    /^DeepSeek rejected the API key Pi resolved for its DeepSeek provider\.$/u,
  );
  const error = await rejectedError(
    searchDeepSeek({ query: "DeepSeek" }, "secret-key", { fetchImpl }),
  );
  expect(JSON.stringify(error)).not.toContain("secret-key");
}

async function mapsMalformedJsonAndInvalidShape() {
  const malformed: HttpResponse = {
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.reject(new SyntaxError("bad json")),
    text: () => Promise.resolve(""),
  };
  await expect(
    searchDeepSeek({ query: "DeepSeek" }, "key", { fetchImpl: fetchOnce(malformed) }),
  ).rejects.toMatchObject({ kind: "parse" });

  const invalidShape = fetchOnce(jsonResponse({ results: [{ title: "missing fields" }] }));
  await expect(
    searchDeepSeek({ query: "DeepSeek" }, "key", { fetchImpl: invalidShape }),
  ).rejects.toMatchObject({ kind: "response" });
}

async function mapsNetworkFailuresAndAborts() {
  const network = fetchOnce(() => Promise.reject(new Error("network down")));
  await expect(
    searchDeepSeek({ query: "DeepSeek" }, "key", { fetchImpl: network }),
  ).rejects.toMatchObject({ kind: "network" });

  const controller = new AbortController();
  controller.abort();
  const abortedFetch = fetchOnce(jsonResponse({ results: [] }));
  await expect(
    searchDeepSeek({ query: "DeepSeek" }, "key", {
      signal: controller.signal,
      fetchImpl: abortedFetch,
    }),
  ).rejects.toMatchObject({ kind: "aborted" });
}

async function rejectsMissingApiKey() {
  await expect(searchDeepSeek({ query: "DeepSeek" }, "")).rejects.toMatchObject({ kind: "auth" });
}

describe("normalizeSearchInput", () => {
  it("applies API defaults", appliesApiDefaults);
  it(
    "validates Unicode lengths, whitespace, count, localization, and boolean fields",
    validatesUnicodeAndFields,
  );
  it("accepts null ori_question and an IPv6 localization", acceptsNullQuestionAndIpv6);
});

describe("searchDeepSeek", () => {
  it("posts the full normalized request with bearer auth", postsFullNormalizedRequest);
  it("passes an abort signal to fetch", passesAbortSignalToFetch);
  it("returns empty results", returnsEmptyResults);
  it("maps HTTP errors and does not leak the API key", mapsHttpErrorsWithoutLeakingTheKey);
  it("maps malformed JSON and invalid response shapes", mapsMalformedJsonAndInvalidShape);
  it("maps network failures and aborts", mapsNetworkFailuresAndAborts);
  it("rejects a missing API key", rejectsMissingApiKey);
});
