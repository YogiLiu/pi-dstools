import type { File } from "node:buffer";

import {
  DEEPSEEK_OCR_URL,
  DEEPSEEK_SEARCH_URL,
  postDeepSeekFormData,
  postDeepSeekJson,
  type DeepSeekFetch,
  type RetryEvent,
} from "../src/index";
import { describe, expect, it, vi } from "vitest";

import {
  fetchInit,
  fetchOnce,
  fetchSequence,
  firstCall,
  hostCast,
  httpFailure,
  instantSleep,
  jsonResponse,
  messageOf,
  rejectedError,
  rejectedSync,
  requestBody,
} from "./fixtures";
import { baseFormOptions, baseOptions } from "./http-helpers";

function rejectsMissingApiKey() {
  const error = rejectedSync(() => {
    void postDeepSeekJson({ ...baseOptions(), apiKey: "" });
  });
  expect(error).toMatchObject({ kind: "auth", message: "Missing DeepSeek API key." });
}

async function postsJsonWithBearerAuth() {
  const fetchImpl = fetchOnce(jsonResponse({ ok: true }));
  const payload = await postDeepSeekJson({
    ...baseOptions(),
    fetchImpl,
    sleep: instantSleep(),
  });
  expect(payload).toEqual({ ok: true });
  const [url, rawInit] = firstCall(fetchImpl);
  const init = fetchInit(rawInit);
  expect(url).toBe(DEEPSEEK_SEARCH_URL);
  expect(init.method).toBe("POST");
  expect(init.headers).toEqual({
    Authorization: "Bearer key",
    "Content-Type": "application/json",
  });
  expect(requestBody(init)).toEqual({ query: "DeepSeek" });
}

function rejectsMissingApiKeyForFormData() {
  const error = rejectedSync(() => {
    void postDeepSeekFormData({ ...baseFormOptions(), apiKey: "" });
  });
  expect(error).toMatchObject({ kind: "auth", message: "Missing DeepSeek API key." });
}

async function postsFormDataWithBearerAuth() {
  const options = baseFormOptions();
  const fetchImpl = fetchOnce(jsonResponse({ ok: true }));
  await expect(postDeepSeekFormData({ ...options, fetchImpl })).resolves.toEqual({ ok: true });
  const [url, rawInit] = firstCall(fetchImpl);
  const init = fetchInit(rawInit);
  expect(url).toBe(DEEPSEEK_OCR_URL);
  expect(init.method).toBe("POST");
  expect(init.headers).toEqual({ Authorization: "Bearer key" });
  expect(init.body).toBe(options.formData);
  expect(options.formData.get("purpose")).toBe("text_recognition");
  const file = hostCast<File>(options.formData.get("file"));
  expect(file.name).toBe("doc.pdf");
  await expect(file.text()).resolves.toBe("hello");
}

async function retriesFormDataRequests() {
  const options = baseFormOptions();
  const fetchImpl = fetchSequence([httpFailure({ status: 500 }), jsonResponse({ ok: true })]);
  const onRetry = vi.fn<(event: RetryEvent) => void>();
  await expect(
    postDeepSeekFormData({
      ...options,
      fetchImpl,
      sleep: instantSleep(),
      now: () => 0,
      onRetry,
    }),
  ).resolves.toEqual({ ok: true });
  expect(fetchImpl).toHaveBeenCalledTimes(2);
  expect(onRetry).toHaveBeenCalledWith({
    attempt: 1,
    maxRetries: 2,
    status: 500,
    delayMs: 500,
  });
  const [, firstInit] = firstCall(fetchImpl);
  expect(fetchInit(firstInit).body).toBe(options.formData);
  expect(fetchInit(fetchImpl.mock.calls[1]?.[1]).body).toBe(options.formData);
}

async function usesGlobalFetchWhenNoImplementationIsInjected() {
  const fetchImpl = vi.fn<DeepSeekFetch>(() => Promise.resolve(jsonResponse({ ok: true })));
  vi.stubGlobal("fetch", fetchImpl);
  try {
    await expect(postDeepSeekJson(baseOptions())).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllGlobals();
  }
}

async function mapsParseNetworkAndAbortFailures() {
  const malformed = {
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.reject(new SyntaxError("bad json")),
    text: () => Promise.resolve(""),
  };
  const parseError = await rejectedError(
    postDeepSeekJson({ ...baseOptions(), fetchImpl: fetchOnce(malformed) }),
  );
  expect(parseError).toMatchObject({ kind: "parse" });

  const networkError = await rejectedError(
    postDeepSeekJson({
      ...baseOptions(),
      fetchImpl: fetchOnce(() => Promise.reject(new Error("network down"))),
    }),
  );
  expect(networkError).toMatchObject({ kind: "network" });
  expect(messageOf(networkError)).toContain("network down");

  const timeoutError = Object.assign(new Error("timeout"), { name: "TimeoutError" });
  const abortFromSleep = await rejectedError(
    postDeepSeekJson({
      ...baseOptions(),
      fetchImpl: fetchOnce(httpFailure({ status: 500 })),
      sleep: () => Promise.reject(timeoutError),
    }),
  );
  expect(abortFromSleep).toMatchObject({ kind: "aborted" });
  expect(messageOf(abortFromSleep)).toBe("DeepSeek search was cancelled.");

  const controller = new AbortController();
  controller.abort();
  const abortedBeforeRequest = await rejectedError(
    postDeepSeekJson({
      ...baseOptions(),
      signal: controller.signal,
      fetchImpl: fetchOnce(jsonResponse({ ok: true })),
    }),
  );
  expect(abortedBeforeRequest).toMatchObject({ kind: "aborted" });
}

describe("shared DeepSeek HTTP client", () => {
  it("rejects a missing API key", rejectsMissingApiKey);
  it("posts JSON with bearer auth", postsJsonWithBearerAuth);
  it("rejects a missing API key for form data", rejectsMissingApiKeyForFormData);
  it("posts form data with bearer auth and no JSON content type", postsFormDataWithBearerAuth);
  it("retries form data requests with the same body", retriesFormDataRequests);
  it(
    "uses global fetch when no implementation is injected",
    usesGlobalFetchWhenNoImplementationIsInjected,
  );
  it("maps parse, network, and abort failures", mapsParseNetworkAndAbortFailures);
});
