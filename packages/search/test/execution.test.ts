import {
  type ContentOptions,
  type CredentialRegistry,
  DEEPSEEK_OFFICIAL_ORIGIN,
  DEEPSEEK_PROVIDER_ID,
  DeepSeekToolError,
} from "@pi-dstools/deepseek";
import { Check } from "typebox/value";
import { describe, expect, it, vi } from "vitest";

import { searchDeepSeek } from "../src/client";
import { prepareSearchOutput } from "../src/output";
import { DS_SEARCH_OUTPUT_SCHEMA } from "../src/schemas";
import { createDsSearchTool } from "../src/tool";
import {
  detailsOf,
  firstText,
  makeContext,
  makeDeps,
  makePrepared,
  makeRegistry,
  makeResult,
} from "./helpers";

async function returnsFormattedContentAndStableDetails() {
  const results = [makeResult()];
  const searchMock = vi.fn<typeof searchDeepSeek>(() => Promise.resolve({ results }));
  const prepareMock = vi.fn<typeof prepareSearchOutput>((_request, response) =>
    Promise.resolve(makePrepared(response.results)),
  );
  const { registry } = makeRegistry({ auth: { auth: { apiKey: "resolved-key" } } });
  const tool = createDsSearchTool(makeDeps({ search: searchMock, prepare: prepareMock }));

  const result = await tool.execute(
    "call-1",
    { query: "DeepSeek" },
    undefined,
    undefined,
    makeContext(registry),
  );

  expect(searchMock).toHaveBeenCalledWith(
    expect.objectContaining({ query: "DeepSeek", count: 10, need_content: false }),
    "resolved-key",
    expect.any(Object),
  );
  expect(prepareMock).toHaveBeenCalledWith(
    expect.objectContaining({ query: "DeepSeek" }),
    { results },
    {},
  );
  expect(firstText(result)).toBe("formatted results");
  expect(result.details).toMatchObject({ query: "DeepSeek", resultCount: 1 });
  expect(result.structuredContent).toEqual(results);
  expect(Check(DS_SEARCH_OUTPUT_SCHEMA, result.structuredContent)).toBe(true);
  expect(result.isError).not.toBe(true);
  expect(JSON.stringify(result)).not.toContain("resolved-key");
}

async function mapsMissingCredentialsToErrorResult() {
  const { registry } = makeRegistry({ auth: "unresolved" });
  const searchMock = vi.fn<typeof searchDeepSeek>(() => Promise.resolve({ results: [] }));
  const tool = createDsSearchTool(makeDeps({ search: searchMock }));
  const result = await tool.execute(
    "call-2",
    { query: "DeepSeek" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toEqual([]);
  expect(firstText(result)).toContain("installed but unavailable");
  expect(firstText(result)).toContain("Pi did not resolve credentials");
  expect(detailsOf(result).error).toContain("installed but unavailable");
  expect(searchMock).not.toHaveBeenCalled();
}

async function mapsClientErrorsToErrorResult() {
  const failingSearch = vi.fn<typeof searchDeepSeek>(() =>
    Promise.reject(new DeepSeekToolError("provider unavailable", "network")),
  );
  const { registry } = makeRegistry();
  const tool = createDsSearchTool(makeDeps({ search: failingSearch }));
  const result = await tool.execute(
    "call-3",
    { query: "DeepSeek" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).toBe(true);
  expect(result.structuredContent).toEqual([]);
  expect(firstText(result)).toBe("provider unavailable");
  expect(detailsOf(result).error).toBe("provider unavailable");
}

async function reportsUnavailableNonOfficialEndpoint() {
  const searchMock = vi.fn<typeof searchDeepSeek>(() => Promise.resolve({ results: [] }));
  const tool = createDsSearchTool(makeDeps({ search: searchMock }));
  const { registry, getProvider, getProviderAuth } = makeRegistry({
    providerBaseUrl: "https://proxy.example.com/v1",
  });
  const result = await tool.execute(
    "call-endpoint",
    { query: "DeepSeek" },
    undefined,
    undefined,
    makeContext(registry),
  );

  expect(result.isError).toBe(true);
  expect(result.structuredContent).toEqual([]);
  expect(firstText(result)).toContain("installed but unavailable");
  expect(firstText(result)).toContain("https://proxy.example.com");
  expect(detailsOf(result).error).toContain("Pi connects to DeepSeek");
  expect(getProvider).toHaveBeenCalledWith(DEEPSEEK_PROVIDER_ID);
  expect(getProviderAuth).not.toHaveBeenCalled();
  expect(searchMock).not.toHaveBeenCalled();
}

async function runsWithoutAProviderObject() {
  const results = [makeResult()];
  const searchMock = vi.fn<typeof searchDeepSeek>(() => Promise.resolve({ results }));
  const prepareMock = vi.fn<typeof prepareSearchOutput>(() =>
    Promise.resolve(makePrepared(results)),
  );
  const tool = createDsSearchTool(makeDeps({ search: searchMock, prepare: prepareMock }));
  const { registry } = makeRegistry({ providerMissing: true });
  const result = await tool.execute(
    "call-no-provider",
    { query: "DeepSeek" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(result.isError).not.toBe(true);
  expect(searchMock).toHaveBeenCalledTimes(1);
}

async function rechecksTheEndpointOnEveryCall() {
  const results = [makeResult()];
  const searchMock = vi.fn<typeof searchDeepSeek>(() => Promise.resolve({ results }));
  const prepareMock = vi.fn<typeof prepareSearchOutput>(() =>
    Promise.resolve(makePrepared(results)),
  );
  const tool = createDsSearchTool(makeDeps({ search: searchMock, prepare: prepareMock }));
  const getProvider = vi
    .fn<CredentialRegistry["getProvider"]>()
    .mockReturnValueOnce({ baseUrl: `${DEEPSEEK_OFFICIAL_ORIGIN}/v1` })
    .mockReturnValueOnce({})
    .mockReturnValueOnce({ baseUrl: "https://proxy.example.com" });
  const getProviderAuth = vi.fn<CredentialRegistry["getProviderAuth"]>(() =>
    Promise.resolve({ auth: { apiKey: "resolved-key" } }),
  );
  const registry: CredentialRegistry = { getProvider, getProviderAuth };
  const execute = (id: string) =>
    tool.execute(id, { query: "DeepSeek" }, undefined, undefined, makeContext(registry));

  const official = await execute("call-official");
  const withoutBaseUrl = await execute("call-no-base-url");
  const blocked = await execute("call-changed");
  expect(official.isError).not.toBe(true);
  expect(withoutBaseUrl.isError).not.toBe(true);
  expect(blocked.isError).toBe(true);
  expect(firstText(blocked)).toContain("installed but unavailable");
  expect(searchMock).toHaveBeenCalledTimes(2);
  expect(getProvider).toHaveBeenCalledTimes(3);
}

async function forwardsAbortSignalsAndPrepareOptions() {
  const results = [makeResult()];
  const searchMock = vi.fn<typeof searchDeepSeek>(() => Promise.resolve({ results }));
  const prepareOptions: ContentOptions = { uuid: () => "custom-uuid" };
  const prepareMock = vi.fn<typeof prepareSearchOutput>(() =>
    Promise.resolve(makePrepared(results)),
  );
  const tool = createDsSearchTool(
    makeDeps({ search: searchMock, prepare: prepareMock, prepareOptions }),
  );
  const { registry } = makeRegistry();
  const controller = new AbortController();

  await tool.execute(
    "call-signal",
    { query: "DeepSeek" },
    controller.signal,
    undefined,
    makeContext(registry),
  );
  expect(searchMock).toHaveBeenLastCalledWith(
    expect.any(Object),
    "resolved-key",
    expect.objectContaining({ signal: controller.signal }),
  );
  expect(prepareMock).toHaveBeenLastCalledWith(expect.any(Object), { results }, prepareOptions);

  await tool.execute(
    "call-context-signal",
    { query: "DeepSeek" },
    undefined,
    undefined,
    makeContext(registry, controller.signal),
  );
  expect(searchMock).toHaveBeenLastCalledWith(
    expect.any(Object),
    "resolved-key",
    expect.objectContaining({ signal: controller.signal }),
  );
}

describe("ds_search execution", () => {
  it(
    "returns formatted content, stable details, and structured raw results",
    returnsFormattedContentAndStableDetails,
  );
  it("maps missing credentials to an isError result", mapsMissingCredentialsToErrorResult);
  it("maps client errors to an isError result", mapsClientErrorsToErrorResult);
  it(
    "stays installed but reports unavailability when Pi's provider endpoint is not official",
    reportsUnavailableNonOfficialEndpoint,
  );
  it("runs when Pi reports no deepseek provider object", runsWithoutAProviderObject);
  it("rechecks the provider endpoint on every call", rechecksTheEndpointOnEveryCall);
  it("forwards abort signals from the call and context", forwardsAbortSignalsAndPrepareOptions);
});
