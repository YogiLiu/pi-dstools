import { DEEPSEEK_PROVIDER_ID, resolveDeepSeekApiKey } from "@pi-dstools/deepseek";
import { Check } from "typebox/value";
import { describe, expect, it, vi } from "vitest";

import { searchDeepSeek } from "../src/client";
import searchExtension, { createDsSearchTool } from "../src/index";
import { DS_SEARCH_OUTPUT_SCHEMA, DS_SEARCH_PARAMS } from "../src/schemas";
import {
  detailsOf,
  firstText,
  hostCast,
  makeContext,
  makeDeps,
  makeRegistry,
  makeResult,
  throwNonError,
} from "./helpers";

function registersFullToolDefinition() {
  const tool = createDsSearchTool();
  expect(tool.name).toBe("ds_search");
  expect(tool.label).toBe("DeepSeek Search");
  expect(tool.defaultActive).toBe(true);
  expect(tool.parameters).toBe(DS_SEARCH_PARAMS);
  expect(tool.outputSchema).toBe(DS_SEARCH_OUTPUT_SCHEMA);
  expect(tool.description).toContain("total line counts");
  expect(tool.promptSnippet).toContain("DeepSeek");
  expect(tool.promptGuidelines?.join("\n")).toContain("ds_search");
  expect(tool.promptGuidelines?.join("\n")).toContain("read");
  expect(tool.promptGuidelines?.join("\n")).toContain("Total Lines");
  expect(tool.promptGuidelines?.join("\n")).toContain("untrusted");
  expect(JSON.stringify(tool.parameters)).toContain("need_content");
}

function validatesRawResultsAgainstOutputSchema() {
  expect(Check(DS_SEARCH_OUTPUT_SCHEMA, [makeResult()])).toBe(true);
  expect(
    Check(DS_SEARCH_OUTPUT_SCHEMA, [makeResult({ site_name: null, site_icon: null, date: null })]),
  ).toBe(true);
  expect(Check(DS_SEARCH_OUTPUT_SCHEMA, { results: [makeResult()] })).toBe(false);
  expect(Check(DS_SEARCH_OUTPUT_SCHEMA, [{ title: "missing fields" }])).toBe(false);
}

function registersThroughDefaultEntryPoint() {
  const registerTool = vi.fn<(tool: unknown) => void>();
  searchExtension(hostCast({ registerTool }));
  expect(registerTool).toHaveBeenCalledWith(expect.objectContaining({ name: "ds_search" }));
}

async function resolvesCredentialsThroughDefaultFacade() {
  const { registry, getProviderAuth } = makeRegistry({
    auth: { auth: { apiKey: "runtime-key" } },
  });
  await expect(resolveDeepSeekApiKey(registry, "ds_search")).resolves.toBe("runtime-key");
  expect(getProviderAuth).toHaveBeenCalledWith(DEEPSEEK_PROVIDER_ID);
}

async function normalizesInvalidParamsAndNonErrorFailures() {
  const failure = { toString: () => "provider unavailable" };
  const searchMock = vi.fn<typeof searchDeepSeek>(() => {
    throwNonError(failure);
  });
  const tool = createDsSearchTool(makeDeps({ search: searchMock }));
  const { registry } = makeRegistry();

  const invalid = await tool.execute(
    "call-invalid",
    hostCast({ query: 42 }),
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(invalid.isError).toBe(true);
  expect(firstText(invalid)).toContain("query must be a string");
  expect(detailsOf(invalid).query).toBe("");
  expect(searchMock).not.toHaveBeenCalled();

  const failed = await tool.execute(
    "call-failed",
    { query: "DeepSeek" },
    undefined,
    undefined,
    makeContext(registry),
  );
  expect(failed.isError).toBe(true);
  expect(firstText(failed)).toBe("provider unavailable");
  expect(detailsOf(failed).error).toBe("provider unavailable");
  expect(searchMock).toHaveBeenCalledTimes(1);
}

describe("tool definition and output schema", () => {
  it(
    "registers ds_search with full parameters, prompt guidance, and an array output schema",
    registersFullToolDefinition,
  );
  it(
    "validates the raw results array against outputSchema",
    validatesRawResultsAgainstOutputSchema,
  );
});

describe("default Pi integration", () => {
  it(
    "registers ds_search through the default extension entry point",
    registersThroughDefaultEntryPoint,
  );
  it(
    "resolves credentials through the default Pi registry facade",
    resolvesCredentialsThroughDefaultFacade,
  );
});

describe("execution contracts", () => {
  it(
    "normalizes invalid params and non-Error failures into readable error results",
    normalizesInvalidParamsAndNonErrorFailures,
  );
});
