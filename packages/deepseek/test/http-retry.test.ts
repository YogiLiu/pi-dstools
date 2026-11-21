import {
  defaultSleep,
  isRetryableStatus,
  postDeepSeekJson,
  retryDelayMs,
  type HttpResponse,
  type RetryEvent,
  type Sleep,
} from "../src/index";
import { describe, expect, it, vi } from "vitest";

import {
  fetchOnce,
  fetchSequence,
  httpFailure,
  instantSleep,
  jsonResponse,
  messageOf,
  rejectedError,
} from "./fixtures";
import { baseOptions, headers } from "./http-helpers";

function computesRetryableStatuses() {
  expect(
    [407, 408, 409, 429, 499, 500, 599, 600].map((status) => isRetryableStatus(status)),
  ).toEqual([false, true, false, true, false, true, true, false]);
}

function parsesRetryAfterHeaders() {
  const now = Date.parse("2026-01-01T00:00:00Z");
  expect(retryDelayMs(undefined, 0, now)).toBe(500);
  expect(retryDelayMs(undefined, 1, now)).toBe(1000);
  expect(retryDelayMs(undefined, 2, now)).toBe(1000);
  expect(retryDelayMs(headers({ "retry-after-ms": "250" }), 0, now)).toBe(250);
  expect(retryDelayMs(headers({ "retry-after-ms": "120000" }), 0, now)).toBe(60000);
  expect(retryDelayMs(headers({ "retry-after-ms": "-1" }), 0, now)).toBe(500);
  expect(retryDelayMs(headers({ "retry-after-ms": "invalid" }), 0, now)).toBe(500);
  expect(retryDelayMs(headers({ "retry-after": "2" }), 0, now)).toBe(2000);
  expect(retryDelayMs(headers({ "retry-after": "120" }), 0, now)).toBe(60000);
  expect(retryDelayMs(headers({ "retry-after": "-1" }), 0, now)).toBe(500);
  expect(retryDelayMs(headers({ "retry-after": "not-a-date" }), 0, now)).toBe(500);
  expect(retryDelayMs(headers({ "retry-after": "Thu, 01 Jan 2026 00:00:30 GMT" }), 0, now)).toBe(
    30000,
  );
  expect(retryDelayMs(headers({ "retry-after": "Wed, 31 Dec 2025 23:59:59 GMT" }), 0, now)).toBe(0);
  expect(
    retryDelayMs(
      headers({
        "retry-after-ms": "invalid",
        "retry-after": "Thu, 01 Jan 2026 00:02:00 GMT",
      }),
      0,
      now,
    ),
  ).toBe(60000);
  expect(retryDelayMs(headers({ other: "value" }), 0, now)).toBe(500);
}

async function retriesWithConfiguredDelaysAndCallbacks() {
  const fetchImpl = fetchSequence([
    httpFailure({ status: 500, headers: { "retry-after-ms": "250" } }),
    httpFailure({ status: 429, headers: { "retry-after": "2" } }),
    jsonResponse({ ok: true }),
  ]);
  const sleep = vi.fn<Sleep>(() => Promise.resolve());
  const onRetry = vi.fn<(event: RetryEvent) => void>();
  await expect(
    postDeepSeekJson({
      ...baseOptions(),
      apiName: "Fetch",
      fetchImpl,
      sleep,
      now: () => 0,
      onRetry,
    }),
  ).resolves.toEqual({ ok: true });
  expect(fetchImpl).toHaveBeenCalledTimes(3);
  expect(onRetry).toHaveBeenNthCalledWith(1, {
    attempt: 1,
    maxRetries: 2,
    status: 500,
    delayMs: 250,
  });
  expect(onRetry).toHaveBeenNthCalledWith(2, {
    attempt: 2,
    maxRetries: 2,
    status: 429,
    delayMs: 2000,
  });
  expect(sleep.mock.calls[0]?.[0]).toBe(250);
  expect(sleep.mock.calls[1]?.[0]).toBe(2000);
  expect(sleep.mock.calls[0]).toHaveLength(2);
  expect(sleep.mock.calls[1]).toHaveLength(2);
}

async function returnsTheLastRetryableError() {
  const fetchImpl = fetchSequence([
    httpFailure({ status: 500 }),
    httpFailure({ status: 502 }),
    httpFailure({ status: 504, body: JSON.stringify({ error: { message: "still down" } }) }),
  ]);
  const error = await rejectedError(
    postDeepSeekJson({
      ...baseOptions(),
      apiName: "Fetch",
      fetchImpl,
      sleep: instantSleep(),
    }),
  );
  expect(error).toMatchObject({ kind: "http", status: 504 });
  expect(messageOf(error)).toContain("DeepSeek Fetch API returned HTTP 504 Error: still down");
  expect(fetchImpl).toHaveBeenCalledTimes(3);
}

async function doesNotRetryOtherStatuses() {
  const fetchImpl = fetchOnce(httpFailure({ status: 400, body: "bad request" }));
  const error = await rejectedError(
    postDeepSeekJson({
      ...baseOptions(),
      fetchImpl,
      sleep: instantSleep(),
    }),
  );
  expect(error).toMatchObject({ kind: "http", status: 400 });
  expect(messageOf(error)).toContain("bad request");
  expect(fetchImpl).toHaveBeenCalledTimes(1);
}

async function mapsProviderErrorBodiesAndStatusMessages() {
  const cases: readonly {
    readonly response: HttpResponse;
    readonly expected: string;
  }[] = [
    {
      response: httpFailure({ status: 401, body: JSON.stringify({ error: { message: "bad" } }) }),
      expected: "DeepSeek rejected the API key Pi resolved for its DeepSeek provider.",
    },
    {
      response: httpFailure({ status: 402, body: "{}" }),
      expected: "DeepSeek account has insufficient balance.",
    },
    {
      response: httpFailure({ status: 429, body: "rate limited" }),
      expected: "DeepSeek Fetch API rate limit exceeded.",
    },
  ];
  await Promise.all(
    cases.map(async ({ response, expected }) => {
      const error = await rejectedError(
        postDeepSeekJson({
          ...baseOptions(),
          apiName: "Fetch",
          fetchImpl: fetchOnce(response),
          sleep: instantSleep(),
        }),
      );
      expect(messageOf(error)).toContain(expected);
    }),
  );

  const errorWithNonStringMessage = await rejectedError(
    postDeepSeekJson({
      ...baseOptions(),
      apiName: "Fetch",
      fetchImpl: fetchOnce(
        httpFailure({ status: 403, body: JSON.stringify({ error: { message: 42 } }) }),
      ),
      sleep: instantSleep(),
    }),
  );
  expect(messageOf(errorWithNonStringMessage)).toBe("DeepSeek Fetch API returned HTTP 403 Error");
}

async function usesDefaultSleepAndClock() {
  vi.useFakeTimers();
  try {
    const fetchImpl = fetchSequence([
      httpFailure({ status: 500, body: "" }),
      jsonResponse({ ok: true }),
    ]);
    const promise = postDeepSeekJson({ ...baseOptions(), fetchImpl });
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(500);
    await expect(promise).resolves.toEqual({ ok: true });
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  } finally {
    vi.useRealTimers();
  }
}

async function defaultSleepHandlesTimersAndAbort() {
  vi.useFakeTimers();
  try {
    const withoutSignal = defaultSleep(0);
    await vi.advanceTimersByTimeAsync(0);
    await expect(withoutSignal).resolves.toBeUndefined();

    const controller = new AbortController();
    const withSignal = defaultSleep(10, controller.signal);
    await vi.advanceTimersByTimeAsync(10);
    await expect(withSignal).resolves.toBeUndefined();

    const preAborted = new AbortController();
    preAborted.abort();
    await expect(defaultSleep(0, preAborted.signal)).rejects.toMatchObject({ name: "AbortError" });

    const abortDuringWait = new AbortController();
    const pending = defaultSleep(100, abortDuringWait.signal);
    abortDuringWait.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
  } finally {
    vi.useRealTimers();
  }
}

async function mapsSleepAbortWithActiveSignal() {
  const controller = new AbortController();
  const sleep = vi.fn<Sleep>(() => {
    controller.abort();
    return Promise.reject(new Error("cancelled"));
  });
  const error = await rejectedError(
    postDeepSeekJson({
      ...baseOptions(),
      fetchImpl: fetchOnce(httpFailure({ status: 500 })),
      signal: controller.signal,
      sleep,
    }),
  );
  expect(error).toMatchObject({ kind: "aborted" });
  expect(messageOf(error)).toBe("DeepSeek search was cancelled.");
  expect(sleep).toHaveBeenCalledTimes(1);
}

describe("shared DeepSeek retry behavior", () => {
  it("computes retryable statuses", computesRetryableStatuses);
  it("parses Retry-After headers", parsesRetryAfterHeaders);
  it("retries with configured delays and callbacks", retriesWithConfiguredDelaysAndCallbacks);
  it("returns the last retryable error", returnsTheLastRetryableError);
  it("does not retry other statuses", doesNotRetryOtherStatuses);
  it("maps provider error bodies and status messages", mapsProviderErrorBodiesAndStatusMessages);
  it("uses the default sleep and clock", usesDefaultSleepAndClock);
  it("handles default sleep timers and abort", defaultSleepHandlesTimersAndAbort);
  it("maps an active signal abort during sleep", mapsSleepAbortWithActiveSignal);
});
