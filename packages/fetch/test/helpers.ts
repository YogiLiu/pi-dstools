import {
  contentOptions,
  detailsOf as genericDetailsOf,
  errorResponse,
  fakeFileSystem,
  fetchInit,
  fetchOnce,
  fetchSequence,
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
import type { DsFetchDependencies } from "../src/tool";
import type { DeepSeekFetchResponse, FetchToolDetails, PreparedFetchOutput } from "../src/types";

export {
  contentOptions,
  errorResponse,
  fakeFileSystem,
  fetchInit,
  fetchOnce,
  fetchSequence,
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

export function makeFetchResponse(
  overrides: Partial<DeepSeekFetchResponse> = {},
): DeepSeekFetchResponse {
  return {
    title: "Example article",
    content: "# Example article\n\nArticle content.",
    ...overrides,
  };
}

export function makeDetails(overrides: Partial<FetchToolDetails> = {}): FetchToolDetails {
  return {
    url: "https://example.com/article",
    title: "Example article",
    summary: "# Example article\n\nArticle content.",
    ...overrides,
  };
}

export function makePrepared(response: DeepSeekFetchResponse): PreparedFetchOutput {
  return {
    contentText: "formatted fetch result",
    details: makeDetails({ title: response.title }),
    structuredContent: response,
  };
}

export function makeDeps(
  overrides: Readonly<Partial<DsFetchDependencies>> = {},
): DsFetchDependencies {
  return overrides;
}

export function detailsOf(result: { readonly details?: unknown }): FetchToolDetails {
  return genericDetailsOf<FetchToolDetails>(result);
}
