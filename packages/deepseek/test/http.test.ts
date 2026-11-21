import { DEEPSEEK_SEARCH_URL, postDeepSeekJson, type DeepSeekFetch } from "../src/index";
import { describe, expect, it, vi } from "vitest";

import {
  fetchInit,
  fetchOnce,
  firstCall,
  httpFailure,
  instantSleep,
  jsonResponse,
  messageOf,
  rejectedError,
  rejectedSync,
  requestBody,
} from "./fixtures";
import { baseOptions } from "./http-helpers";

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
  it(
    "uses global fetch when no implementation is injected",
    usesGlobalFetchWhenNoImplementationIsInjected,
  );
  it("maps parse, network, and abort failures", mapsParseNetworkAndAbortFailures);
});
