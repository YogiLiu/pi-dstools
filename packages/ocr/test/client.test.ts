import type { File } from "node:buffer";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { DEEPSEEK_OCR_URL, type DeepSeekFetch, type RetryEvent } from "@pi-dstools/deepseek";
import { describe, expect, it, vi } from "vitest";

import { normalizeOcrInput, ocrDeepSeek } from "../src/client";
import { MAX_OCR_FILE_BYTES } from "../src/constants";
import {
  errorResponse,
  fakeOcrFileSystem,
  fetchInit,
  fetchOnce,
  fetchSequence,
  firstCall,
  formData,
  hostCast,
  httpFailure,
  instantSleep,
  jsonResponse,
  makeOcrResponse,
  makeRequest,
  messageOf,
  rejectedError,
} from "./helpers";

const REQUEST = makeRequest();

async function postsFormDataWithFilenamePurposeAuthAndSignal() {
  const { fs, stat, readFile } = fakeOcrFileSystem();
  const response = makeOcrResponse();
  const controller = new AbortController();
  const fetchImpl = fetchOnce(jsonResponse(response));
  const onRetry = vi.fn<(event: RetryEvent) => void>();
  await expect(
    ocrDeepSeek(REQUEST, "secret-key", {
      fileSystem: fs,
      fetchImpl,
      signal: controller.signal,
      sleep: instantSleep(),
      onRetry,
    }),
  ).resolves.toEqual(response);

  const [url, rawInit] = firstCall(fetchImpl);
  const init = fetchInit(rawInit);
  expect(url).toBe(DEEPSEEK_OCR_URL);
  expect(init.method).toBe("POST");
  expect(init.headers).toEqual({ Authorization: "Bearer secret-key" });
  expect(init.signal).toBe(controller.signal);
  expect(JSON.stringify(init.headers)).not.toContain("Content-Type");
  const form = formData(rawInit);
  expect(form.get("purpose")).toBe("text_recognition");
  const file = hostCast<File>(form.get("file"));
  expect(file.name).toBe("doc.pdf");
  await expect(file.text()).resolves.toBe("hello");
  expect(stat).toHaveBeenCalledWith(REQUEST.path);
  expect(readFile).toHaveBeenCalledWith(REQUEST.path);
  expect(onRetry).not.toHaveBeenCalled();
}

async function usesDefaultFileSystemAndGlobalFetch() {
  const directory = await mkdtemp(join(tmpdir(), "pi-dstools-ocr-"));
  const path = join(directory, "doc.pdf");
  await writeFile(path, "hello");
  const response = makeOcrResponse();
  const globalFetch = vi.fn<DeepSeekFetch>(() => Promise.resolve(jsonResponse(response)));
  vi.stubGlobal("fetch", globalFetch);
  try {
    const request = normalizeOcrInput({ path }, directory);
    await expect(ocrDeepSeek(request, "key")).resolves.toEqual(response);
    expect(globalFetch).toHaveBeenCalledTimes(1);
    const [, rawInit] = firstCall(globalFetch);
    const file = hostCast<File>(formData(rawInit).get("file"));
    expect(file.name).toBe("doc.pdf");
    await expect(file.text()).resolves.toBe("hello");
  } finally {
    vi.unstubAllGlobals();
    await rm(directory, { recursive: true, force: true });
  }
}

async function rejectsMissingKeyBeforeReadingFile() {
  const { fs, stat } = fakeOcrFileSystem();
  const error = await rejectedError(ocrDeepSeek(REQUEST, "", { fileSystem: fs }));
  expect(error).toMatchObject({ kind: "auth", message: "Missing DeepSeek API key." });
  expect(stat).not.toHaveBeenCalled();
}

async function mapsFileSystemFailuresAndLimits() {
  const oversizedBytes = hostCast<readonly number[]>({ length: MAX_OCR_FILE_BYTES + 1 });
  const cases: readonly {
    readonly fs: ReturnType<typeof fakeOcrFileSystem>["fs"];
    readonly kind: string;
    readonly message: string;
  }[] = [
    {
      fs: fakeOcrFileSystem({ failStat: true }).fs,
      kind: "filesystem",
      message: "Failed to inspect OCR file",
    },
    {
      fs: fakeOcrFileSystem({ failRead: true }).fs,
      kind: "filesystem",
      message: "Failed to read OCR file",
    },
    {
      fs: fakeOcrFileSystem({ isFile: false }).fs,
      kind: "validation",
      message: "regular file",
    },
    {
      fs: fakeOcrFileSystem({ size: MAX_OCR_FILE_BYTES + 1 }).fs,
      kind: "validation",
      message: "exceeds",
    },
    {
      fs: fakeOcrFileSystem({ size: 0, bytes: oversizedBytes }).fs,
      kind: "validation",
      message: "exceeds",
    },
  ];
  await Promise.all(
    cases.map(async ({ fs, kind, message }) => {
      const error = await rejectedError(ocrDeepSeek(REQUEST, "key", { fileSystem: fs }));
      expect(error).toMatchObject({ kind });
      expect(messageOf(error)).toContain(message);
    }),
  );
}

async function retriesFormDataWithSameBody() {
  const { fs } = fakeOcrFileSystem();
  const response = makeOcrResponse();
  const fetchImpl = fetchSequence([httpFailure({ status: 500 }), jsonResponse(response)]);
  const onRetry = vi.fn<(event: RetryEvent) => void>();
  await expect(
    ocrDeepSeek(REQUEST, "key", {
      fileSystem: fs,
      fetchImpl,
      sleep: instantSleep(),
      now: () => 0,
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
  expect(formData(fetchImpl.mock.calls[0]?.[1])).toBe(formData(fetchImpl.mock.calls[1]?.[1]));
}

async function mapsRetryableRateLimitFailures() {
  const { fs } = fakeOcrFileSystem();
  const rateLimitFetch = fetchOnce(errorResponse(429, "rate limited"));
  const error = await rejectedError(
    ocrDeepSeek(REQUEST, "key", {
      fileSystem: fs,
      fetchImpl: rateLimitFetch,
      sleep: instantSleep(),
    }),
  );
  expect(error).toMatchObject({ kind: "http", status: 429 });
  expect(messageOf(error)).toContain("DeepSeek OCR API rate limit exceeded.");
  expect(rateLimitFetch).toHaveBeenCalledTimes(3);
}

async function mapsCancellationNetworkAndParseFailures() {
  const { fs } = fakeOcrFileSystem();
  const response = makeOcrResponse();
  const controller = new AbortController();
  controller.abort();
  const cancelledFetch = fetchOnce(jsonResponse(response));
  const cancelled = await rejectedError(
    ocrDeepSeek(REQUEST, "key", {
      fileSystem: fs,
      fetchImpl: cancelledFetch,
      signal: controller.signal,
    }),
  );
  expect(cancelled).toMatchObject({ kind: "aborted" });
  expect(messageOf(cancelled)).toBe("DeepSeek ocr was cancelled.");
  expect(cancelledFetch).not.toHaveBeenCalled();

  const network = await rejectedError(
    ocrDeepSeek(REQUEST, "key", {
      fileSystem: fs,
      fetchImpl: fetchOnce(() => Promise.reject(new Error("network down"))),
    }),
  );
  expect(network).toMatchObject({ kind: "network" });
  expect(messageOf(network)).toContain("network down");

  const malformed = {
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.reject(new SyntaxError("bad json")),
    text: () => Promise.resolve(""),
  };
  const parseError = await rejectedError(
    ocrDeepSeek(REQUEST, "key", { fileSystem: fs, fetchImpl: fetchOnce(malformed) }),
  );
  expect(parseError).toMatchObject({ kind: "parse" });
}

describe("ocrDeepSeek", () => {
  it(
    "posts form data with filename, purpose, auth, and signal",
    postsFormDataWithFilenamePurposeAuthAndSignal,
  );
  it("uses the default file system and global fetch", usesDefaultFileSystemAndGlobalFetch);
  it("rejects a missing key before reading the file", rejectsMissingKeyBeforeReadingFile);
  it("maps file system failures and limits", mapsFileSystemFailuresAndLimits);
  it("retries form data with the same body", retriesFormDataWithSameBody);
  it("maps retryable rate limit failures", mapsRetryableRateLimitFailures);
  it("maps cancellation, network, and parse failures", mapsCancellationNetworkAndParseFailures);
});
