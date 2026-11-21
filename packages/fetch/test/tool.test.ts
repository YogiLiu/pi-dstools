import {
  type ClientOptions,
  type ContentOptions,
  DEEPSEEK_PROVIDER_ID,
  DeepSeekToolError,
} from "@pi-dstools/deepseek";
import { Check } from "typebox/value";
import { describe, expect, it, vi } from "vitest";

import { fetchDeepSeek } from "../src/client";
import { prepareFetchOutput } from "../src/output";
import { DS_FETCH_OUTPUT_SCHEMA, DS_FETCH_PARAMS } from "../src/schemas";
import { createDsFetchTool } from "../src/tool";
import {
  detailsOf,
  firstText,
  hostCast,
  instantSleep,
  makeContext,
  makeDeps,
  makeFetchResponse,
  makePrepared,
  makeRegistry,
  throwNonError,
} from "./helpers";

const EMPTY = { title: "", content: "" } as const;

function registersFullToolDefinition() {
  const tool = createDsFetchTool();
  expect(tool.name).toBe("ds_fetch");
  expect(tool.label).toBe("DeepSeek Fetch");
  expect(tool.defaultActive).toBe(true);
  expect(tool.parameters).toBe(DS_FETCH_PARAMS);
  expect(tool.outputSchema).toBe(DS_FETCH_OUTPUT_SCHEMA);
  expect(tool.description).toContain("table of contents");
  expect(tool.description).toContain("total line count");
  expect(tool.promptSnippet).toContain("DeepSeek");
  expect(tool.promptGuidelines?.join("\n")).toContain("ds_fetch");
  expect(tool.promptGuidelines?.join("\n")).toContain("read");
  expect(tool.promptGuidelines?.join("\n")).toContain("Line values");
  expect(tool.promptGuidelines?.join("\n")).toContain("Total Lines");
  expect(tool.promptGuidelines?.join("\n")).toContain("untrusted");
  expect(JSON.stringify(tool.parameters)).toContain("url");
}

function validatesRawResponseAgainstOutputSchema() {
  expect(Check(DS_FETCH_OUTPUT_SCHEMA, makeFetchResponse())).toBe(true);
  expect(Check(DS_FETCH_OUTPUT_SCHEMA, EMPTY)).toBe(true);
  expect(Check(DS_FETCH_OUTPUT_SCHEMA, { title: "missing content" })).toBe(false);
  expect(Check(DS_FETCH_OUTPUT_SCHEMA, null)).toBe(false);
}

async function usesDefaultRuntimeForInvalidParams() {
  const tool = createDsFetchTool();
  const { registry } = makeRegistry();
  const result = await tool.execute(
    "call-invalid-default",
    hostCast({ url: 42 }),
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).toBe(true);
  expect(firstText(result)).toContain("url must be a string");
  expect(result.structuredContent).toEqual(EMPTY);
}

async function returnsFormattedContentAndStableDetails() {
  const response = makeFetchResponse();
  const fetchMock = vi.fn<typeof fetchDeepSeek>(() => Promise.resolve(response));
  const prepareMock = vi.fn<typeof prepareFetchOutput>(() =>
    Promise.resolve(makePrepared(response)),
  );
  const { registry } = makeRegistry({ auth: { auth: { apiKey: "resolved-key" } } });
  const tool = createDsFetchTool(makeDeps({ fetch: fetchMock, prepare: prepareMock }));
  const result = await tool.execute(
    "call-success",
    { url: "https://example.com/article" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(firstText(result)).toBe("formatted fetch result");
  expect(result.details).toMatchObject({ url: "https://example.com/article" });
  expect(result.structuredContent).toEqual(response);
  expect(Check(DS_FETCH_OUTPUT_SCHEMA, result.structuredContent)).toBe(true);
  expect(result.isError).not.toBe(true);
  expect(JSON.stringify(result)).not.toContain("resolved-key");
}

async function mapsMissingCredentialsToErrorResult() {
  const { registry } = makeRegistry({ auth: "unresolved" });
  const fetchMock = vi.fn<typeof fetchDeepSeek>(() => Promise.resolve(makeFetchResponse()));
  const tool = createDsFetchTool(makeDeps({ fetch: fetchMock }));
  const result = await tool.execute(
    "call-no-credentials",
    { url: "https://example.com" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toEqual(EMPTY);
  expect(firstText(result)).toContain("installed but unavailable");
  expect(detailsOf(result).error).toContain("Pi did not resolve credentials");
  expect(fetchMock).not.toHaveBeenCalled();
}

async function mapsClientErrorsToErrorResult() {
  const fetchMock = vi.fn<typeof fetchDeepSeek>(() =>
    Promise.reject(new DeepSeekToolError("provider unavailable", "network")),
  );
  const { registry } = makeRegistry();
  const tool = createDsFetchTool(makeDeps({ fetch: fetchMock }));
  const result = await tool.execute(
    "call-client-error",
    { url: "https://example.com" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toEqual(EMPTY);
  expect(firstText(result)).toBe("provider unavailable");
  expect(detailsOf(result).error).toBe("provider unavailable");
}

async function reportsUnavailableNonOfficialEndpoint() {
  const fetchMock = vi.fn<typeof fetchDeepSeek>(() => Promise.resolve(makeFetchResponse()));
  const tool = createDsFetchTool(makeDeps({ fetch: fetchMock }));
  const { registry, getProvider, getProviderAuth } = makeRegistry({
    providerBaseUrl: "https://proxy.example.com/v1",
  });
  const result = await tool.execute(
    "call-endpoint",
    { url: "https://example.com" },
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
  const response = makeFetchResponse();
  const fetchMock = vi.fn<typeof fetchDeepSeek>(() => Promise.resolve(response));
  const prepareMock = vi.fn<typeof prepareFetchOutput>(() =>
    Promise.resolve(makePrepared(response)),
  );
  const tool = createDsFetchTool(makeDeps({ fetch: fetchMock, prepare: prepareMock }));
  const { registry } = makeRegistry({ providerMissing: true });
  const result = await tool.execute(
    "call-no-provider",
    { url: "https://example.com" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).not.toBe(true);
  expect(fetchMock).toHaveBeenCalledTimes(1);
}

async function forwardsSignalsPrepareOptionsAndClientOptions() {
  const response = makeFetchResponse();
  const fetchMock = vi.fn<typeof fetchDeepSeek>(() => Promise.resolve(response));
  const prepareMock = vi.fn<typeof prepareFetchOutput>(() =>
    Promise.resolve(makePrepared(response)),
  );
  const prepareOptions: ContentOptions = { uuid: () => "custom-uuid" };
  const clientOptions: ClientOptions = { sleep: instantSleep() };
  const tool = createDsFetchTool(
    makeDeps({ fetch: fetchMock, prepare: prepareMock, prepareOptions, clientOptions }),
  );
  const { registry } = makeRegistry();
  const controller = new AbortController();

  await tool.execute(
    "call-signal",
    { url: "https://example.com" },
    controller.signal,
    undefined,
    makeContext(registry),
  );
  const firstOptions = hostCast<ClientOptions>(fetchMock.mock.calls.at(-1)?.[2]);
  expect(firstOptions.signal).toBe(controller.signal);
  expect(firstOptions.sleep).toBe(clientOptions.sleep);
  expect(firstOptions.onRetry).toBeTypeOf("function");
  expect(prepareMock).toHaveBeenLastCalledWith(expect.any(Object), response, prepareOptions);

  await tool.execute(
    "call-context-signal",
    { url: "https://example.com" },
    undefined,
    undefined,
    makeContext(registry, controller.signal),
  );
  const contextOptions = hostCast<ClientOptions>(fetchMock.mock.calls.at(-1)?.[2]);
  expect(contextOptions.signal).toBe(controller.signal);
}

async function normalizesInvalidParamsAndNonErrorFailures() {
  const failure = { toString: () => "provider unavailable" };
  const fetchMock = vi.fn<typeof fetchDeepSeek>(() => {
    throwNonError(failure);
  });
  const tool = createDsFetchTool(makeDeps({ fetch: fetchMock }));
  const { registry } = makeRegistry();

  const invalid = await tool.execute(
    "call-invalid",
    hostCast({ url: 42 }),
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(invalid.isError).toBe(true);
  expect(firstText(invalid)).toContain("url must be a string");
  expect(detailsOf(invalid).url).toBe("");
  expect(invalid.structuredContent).toEqual(EMPTY);
  expect(fetchMock).not.toHaveBeenCalled();

  const failed = await tool.execute(
    "call-failed",
    { url: "https://example.com" },
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

describe("ds_fetch tool definition and schema", () => {
  it("registers the full tool definition", registersFullToolDefinition);
  it("validates raw Fetch responses against outputSchema", validatesRawResponseAgainstOutputSchema);
});

describe("ds_fetch execution", () => {
  it("uses the default runtime and rejects invalid params", usesDefaultRuntimeForInvalidParams);
  it("returns formatted content and stable details", returnsFormattedContentAndStableDetails);
  it("maps missing credentials to an isError result", mapsMissingCredentialsToErrorResult);
  it("maps client errors to an isError result", mapsClientErrorsToErrorResult);
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
