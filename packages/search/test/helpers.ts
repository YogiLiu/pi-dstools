import {
  contentOptions,
  detailsOf as genericDetailsOf,
  errorResponse,
  fakeFileSystem,
  fetchInit,
  fetchOnce,
  firstCall,
  firstText,
  hostCast,
  httpFailure,
  instantSleep,
  jsonResponse,
  makeContext,
  makeRegistry,
  messageOf,
  plainTheme,
  rejectedError,
  rejectedSync,
  renderCall,
  renderResult,
  renderText,
  requestBody,
  throwNonError,
} from "../../deepseek/test/fixtures";
import type { RegistryAuth } from "../../deepseek/test/fixtures";
import type { DsSearchDependencies } from "../src/tool";
import type {
  DeepSeekSearchResult,
  PreparedSearchOutput,
  SearchResultDetails,
  SearchToolDetails,
} from "../src/types";

export {
  contentOptions,
  errorResponse,
  fakeFileSystem,
  fetchInit,
  fetchOnce,
  firstCall,
  firstText,
  hostCast,
  httpFailure,
  instantSleep,
  jsonResponse,
  makeContext,
  makeRegistry,
  messageOf,
  plainTheme,
  rejectedError,
  rejectedSync,
  renderCall,
  renderResult,
  renderText,
  requestBody,
  throwNonError,
};
export type { RegistryAuth };

export function makeResult(overrides: Partial<DeepSeekSearchResult> = {}): DeepSeekSearchResult {
  return {
    rerank_score: 2.4,
    title: "DeepSeek V4 model released",
    url: "https://example.com/deepseek-v4",
    snippet: "A short snippet.",
    summary: "A model-readable summary.",
    content: "",
    site_name: "Example News",
    site_icon: "https://example.com/favicon.ico",
    date: "2026-06-01T00:00:00+00:00",
    authority: 3,
    ...overrides,
  };
}

export function makeRecord(index: number): SearchResultDetails {
  return {
    index,
    title: `Title ${index}`,
    siteName: "Example News",
    url: `https://example.com/${index}`,
    date: "2026-06-01",
    snippet: `Snippet ${index}`,
    summary: `Summary ${index}`,
    quality: "high",
    authority: "high",
  };
}

export function makePrepared(results: readonly DeepSeekSearchResult[]): PreparedSearchOutput {
  const details: SearchToolDetails = {
    query: "DeepSeek",
    resultCount: results.length,
    results: [],
  };
  return { contentText: "formatted results", details, structuredContent: results };
}

export function makeDeps(
  overrides: Readonly<Partial<DsSearchDependencies>> = {},
): DsSearchDependencies {
  return overrides;
}

export function detailsOf(result: { readonly details?: unknown }): SearchToolDetails {
  return genericDetailsOf<SearchToolDetails>(result);
}
