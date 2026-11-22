import {
  DEEPSEEK_PROVIDER_ID,
  type ContentOptions,
  type DeepSeekFetch,
} from "@pi-dstools/deepseek";
import { describe, expect, it, vi } from "vitest";

import { ocrDeepSeek } from "../src/client";
import { EMPTY_STRUCTURED_CONTENT, prepareOcrOutput } from "../src/output";
import { createDsOcrTool } from "../src/tool";
import type { OcrClientOptions } from "../src/types";
import {
  detailsOf,
  fakeOcrFileSystem,
  firstText,
  hostCast,
  instantSleep,
  jsonResponse,
  makeContext,
  makeDeps,
  makeOcrContext,
  makeOcrResponse,
  makePrepared,
  makeRegistry,
  throwNonError,
} from "./helpers";

const EMPTY = EMPTY_STRUCTURED_CONTENT;

async function usesDefaultRuntimeForSuccessfulCall() {
  const response = makeOcrResponse();
  const globalFetch = vi.fn<DeepSeekFetch>(() => Promise.resolve(jsonResponse(response)));
  vi.stubGlobal("fetch", globalFetch);
  try {
    const { registry } = makeRegistry();
    const result = await createDsOcrTool().execute(
      "call-default",
      { path: "README.md" },
      undefined,
      undefined,
      makeOcrContext(registry, process.cwd()),
    );
    expect(result.isError).not.toBe(true);
    expect(firstText(result)).toContain("Hello");
    expect(result.structuredContent).toEqual(response);
    expect(globalFetch).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllGlobals();
  }
}

async function reportsUnavailableNonOfficialEndpoint() {
  const fetchMock = vi.fn<typeof ocrDeepSeek>(() => Promise.resolve(makeOcrResponse()));
  const tool = createDsOcrTool(makeDeps({ fetch: fetchMock }));
  const { registry, getProvider, getProviderAuth } = makeRegistry({
    providerBaseUrl: "https://proxy.example.com/v1",
  });
  const result = await tool.execute(
    "call-endpoint",
    { path: "doc.pdf" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toEqual(EMPTY);
  expect(firstText(result)).toContain("installed but unavailable");
  expect(firstText(result)).toContain("https://proxy.example.com");
  expect(detailsOf(result).error).toContain("Pi connects to DeepSeek");
  expect(getProvider).toHaveBeenCalledWith(DEEPSEEK_PROVIDER_ID);
  expect(getProviderAuth).not.toHaveBeenCalled();
  expect(fetchMock).not.toHaveBeenCalled();
}

async function runsWithoutAProviderObject() {
  const response = makeOcrResponse();
  const fetchMock = vi.fn<typeof ocrDeepSeek>(() => Promise.resolve(response));
  const prepareMock = vi.fn<typeof prepareOcrOutput>(() => Promise.resolve(makePrepared(response)));
  const tool = createDsOcrTool(makeDeps({ fetch: fetchMock, prepare: prepareMock }));
  const { registry } = makeRegistry({ providerMissing: true });
  const result = await tool.execute(
    "call-no-provider",
    { path: "doc.pdf" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).not.toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
}

async function forwardsSignalsPrepareOptionsAndClientOptions() {
  const response = makeOcrResponse();
  const fetchMock = vi.fn<typeof ocrDeepSeek>(() => Promise.resolve(response));
  const prepareMock = vi.fn<typeof prepareOcrOutput>(() => Promise.resolve(makePrepared(response)));
  const prepareOptions: ContentOptions = { uuid: () => "custom-uuid" };
  const { fs } = fakeOcrFileSystem();
  const clientOptions: OcrClientOptions = { sleep: instantSleep(), fileSystem: fs };
  const tool = createDsOcrTool(
    makeDeps({ fetch: fetchMock, prepare: prepareMock, prepareOptions, clientOptions }),
  );
  const { registry } = makeRegistry();
  const controller = new AbortController();

  await tool.execute(
    "call-signal",
    { path: "doc.pdf" },
    controller.signal,
    undefined,
    makeContext(registry),
  );
  const firstOptions = hostCast<OcrClientOptions>(fetchMock.mock.calls.at(-1)?.[2]);
  expect(firstOptions.signal).toBe(controller.signal);
  expect(firstOptions.sleep).toBe(clientOptions.sleep);
  expect(firstOptions.fileSystem).toBe(clientOptions.fileSystem);
  expect(firstOptions.onRetry).toBeTypeOf("function");
  expect(prepareMock).toHaveBeenLastCalledWith(expect.any(Object), response, prepareOptions);

  await tool.execute(
    "call-context-signal",
    { path: "doc.pdf" },
    undefined,
    undefined,
    makeContext(registry, controller.signal),
  );
  const contextOptions = hostCast<OcrClientOptions>(fetchMock.mock.calls.at(-1)?.[2]);
  expect(contextOptions.signal).toBe(controller.signal);
}

async function normalizesInvalidParamsAndNonErrorFailures() {
  const failure = { toString: () => "provider unavailable" };
  const fetchMock = vi.fn<typeof ocrDeepSeek>(() => {
    throwNonError(failure);
  });
  const tool = createDsOcrTool(makeDeps({ fetch: fetchMock }));
  const { registry } = makeRegistry();

  const invalid = await tool.execute(
    "call-invalid",
    hostCast({ path: 42 }),
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(invalid.isError).toBe(true);
  expect(firstText(invalid)).toContain("path must be a string");
  expect(detailsOf(invalid).path).toBe("");
  expect(invalid.structuredContent).toEqual(EMPTY);
  expect(fetchMock).not.toHaveBeenCalled();

  const failed = await tool.execute(
    "call-failed",
    { path: "doc.pdf" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(failed.isError).toBe(true);
  expect(firstText(failed)).toBe("provider unavailable");
  expect(detailsOf(failed).error).toBe("provider unavailable");
  expect(failed.structuredContent).toEqual(EMPTY);
  expect(fetchMock).toHaveBeenCalledTimes(1);
}

describe("ds_ocr runtime execution", () => {
  it("uses the default runtime for a successful call", usesDefaultRuntimeForSuccessfulCall);
  it("reports unavailability for a non-official endpoint", reportsUnavailableNonOfficialEndpoint);
  it("runs when Pi reports no provider object", runsWithoutAProviderObject);
  it(
    "forwards signals, prepare options, and client options",
    forwardsSignalsPrepareOptionsAndClientOptions,
  );
  it(
    "normalizes invalid params and non-Error failures",
    normalizesInvalidParamsAndNonErrorFailures,
  );
});
