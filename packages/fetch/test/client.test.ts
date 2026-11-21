import { DEEPSEEK_FETCH_URL, type DeepSeekFetch, type RetryEvent } from "@pi-dstools/deepseek";
import { describe, expect, it, vi } from "vitest";

import { fetchDeepSeek, normalizeFetchInput } from "../src/client";
import {
  errorResponse,
  fetchInit,
  fetchOnce,
  fetchSequence,
  firstCall,
  hostCast,
  httpFailure,
  instantSleep,
  jsonResponse,
  makeFetchResponse,
  messageOf,
  rejectedError,
  requestBody,
} from "./helpers";

function acceptsHttpHttpsAndUnicodeUrls() {
  const prefix = "https://example.com/";
  const exact = `${prefix}${"a".repeat(8192 - prefix.length)}`;
  expect(normalizeFetchInput({ url: exact })).toEqual({ url: exact });
  expect(
    normalizeFetchInput({ url: `https://example.com/${"😀".repeat(8192 - prefix.length)}` }),
  ).toBeDefined();
  expect(normalizeFetchInput({ url: "http://example.com/path?q=1" })).toEqual({
    url: "http://example.com/path?q=1",
  });
  expect(normalizeFetchInput({ url: "https://[2001:db8::1]:8443/page" })).toEqual({
    url: "https://[2001:db8::1]:8443/page",
  });
}

function rejectsInvalidUrls() {
  const prefix = "https://example.com/";
  const tooLong = `${prefix}${"a".repeat(8193 - prefix.length)}`;
  const invalid: readonly unknown[] = [
    null,
    { url: 42 },
    { url: "" },
    { url: tooLong },
    { url: " https://example.com" },
    { url: "https://example.com " },
    { url: "https://example.com/\u0001" },
    { url: "not a url" },
    { url: "https://" },
    { url: "ftp://example.com/page" },
    { url: "https://user:pass@example.com/page" },
    { url: "https://user@example.com/page" },
  ];
  for (const input of invalid) {
    expect(() => normalizeFetchInput(hostCast(input))).toThrow(/url must/u);
  }
}

async function postsOnlyTheUrlWithBearerAuth() {
  const response = makeFetchResponse();
  const fetchImpl = fetchOnce(jsonResponse(response));
  await expect(
    fetchDeepSeek({ url: "https://example.com/article" }, "secret-key", { fetchImpl }),
  ).resolves.toEqual(response);
  const [url, rawInit] = firstCall(fetchImpl);
  const init = fetchInit(rawInit);
  expect(url).toBe(DEEPSEEK_FETCH_URL);
  expect(init.method).toBe("POST");
  expect(init.headers).toEqual({
    Authorization: "Bearer secret-key",
    "Content-Type": "application/json",
  });
  expect(requestBody(init)).toEqual({ url: "https://example.com/article" });
}

async function passesAbortSignalAndUsesGlobalFetch() {
  const controller = new AbortController();
  const fetchImpl = fetchOnce(jsonResponse(makeFetchResponse({ title: "" })));
  await fetchDeepSeek({ url: "https://example.com" }, "key", {
    signal: controller.signal,
    fetchImpl,
  });
  const [, rawInit] = firstCall(fetchImpl);
  expect(fetchInit(rawInit).signal).toBe(controller.signal);

  const globalFetch = vi.fn<DeepSeekFetch>(() =>
    Promise.resolve(jsonResponse(makeFetchResponse())),
  );
  vi.stubGlobal("fetch", globalFetch);
  try {
    await expect(fetchDeepSeek({ url: "https://example.com" }, "key")).resolves.toEqual(
      makeFetchResponse(),
    );
    expect(globalFetch).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllGlobals();
  }
}

async function rejectsInvalidResponsesAndMissingKey() {
  const invalidPayloads: readonly unknown[] = [
    null,
    { title: "only title" },
    { title: 42, content: "" },
    { title: "", content: 42 },
  ];
  await Promise.all(
    invalidPayloads.map(async (payload) => {
      await expect(
        fetchDeepSeek({ url: "https://example.com" }, "key", {
          fetchImpl: fetchOnce(jsonResponse(payload)),
        }),
      ).rejects.toMatchObject({ kind: "response" });
    }),
  );
  await expect(fetchDeepSeek({ url: "https://example.com" }, "")).rejects.toMatchObject({
    kind: "auth",
  });
}

async function mapsFetchHttpStatusesWithoutLeakingTheKey() {
  const nonRetryable = [400, 401, 402, 403, 404, 413];
  await Promise.all(
    nonRetryable.map(async (status) => {
      const fetchImpl = fetchOnce(errorResponse(status, "provider error"));
      const error = await rejectedError(
        fetchDeepSeek({ url: "https://example.com" }, "secret-key", {
          fetchImpl,
          sleep: instantSleep(),
        }),
      );
      expect(error).toMatchObject({ kind: "http", status });
      expect(fetchImpl).toHaveBeenCalledTimes(1);
      expect(JSON.stringify(error)).not.toContain("secret-key");
    }),
  );

  await Promise.all(
    [429, 500, 504].map(async (status) => {
      const fetchImpl = fetchOnce(errorResponse(status, "provider error"));
      const error = await rejectedError(
        fetchDeepSeek({ url: "https://example.com" }, "secret-key", {
          fetchImpl,
          sleep: instantSleep(),
        }),
      );
      expect(error).toMatchObject({ kind: "http", status });
      expect(fetchImpl).toHaveBeenCalledTimes(3);
    }),
  );
}

async function retriesAndCancels() {
  const response = makeFetchResponse();
  const fetchImpl = fetchSequence([httpFailure({ status: 500 }), jsonResponse(response)]);
  const onRetry = vi.fn<(event: RetryEvent) => void>();
  await expect(
    fetchDeepSeek({ url: "https://example.com" }, "key", {
      fetchImpl,
      sleep: instantSleep(),
      onRetry,
    }),
  ).resolves.toEqual(response);
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(onRetry).toHaveBeenCalledWith({
    attempt: 1,
    maxRetries: 2,
    status: 500,
    delayMs: 500,
  });

  const controller = new AbortController();
  controller.abort();
  const aborted = await rejectedError(
    fetchDeepSeek({ url: "https://example.com" }, "key", {
      signal: controller.signal,
      fetchImpl: fetchOnce(jsonResponse(response)),
    }),
  );
  expect(aborted).toMatchObject({ kind: "aborted" });

  const timeout = Object.assign(new Error("timeout"), { name: "TimeoutError" });
  const cancelled = await rejectedError(
    fetchDeepSeek({ url: "https://example.com" }, "key", {
      fetchImpl: fetchOnce(httpFailure({ status: 500 })),
      sleep: () => Promise.reject(timeout),
    }),
  );
  expect(cancelled).toMatchObject({ kind: "aborted" });
  expect(messageOf(cancelled)).toBe("DeepSeek fetch was cancelled.");
}

describe("normalizeFetchInput", () => {
  it("accepts HTTP, HTTPS, IPv6, maximum-length, and Unicode URLs", acceptsHttpHttpsAndUnicodeUrls);
  it("rejects malformed, credential-bearing, non-HTTP, and oversized URLs", rejectsInvalidUrls);
});

describe("fetchDeepSeek", () => {
  it("posts only the url with bearer auth", postsOnlyTheUrlWithBearerAuth);
  it("passes abort signals and uses global fetch", passesAbortSignalAndUsesGlobalFetch);
  it("rejects invalid responses and a missing key", rejectsInvalidResponsesAndMissingKey);
  it("maps Fetch HTTP statuses without leaking the key", mapsFetchHttpStatusesWithoutLeakingTheKey);
  it("retries transient failures and cancels", retriesAndCancels);
});
