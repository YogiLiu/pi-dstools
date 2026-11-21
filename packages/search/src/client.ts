import { isIP } from "node:net";

import {
  DEEPSEEK_SEARCH_URL,
  DeepSeekToolError,
  finiteNumber,
  isRecord,
  nullableString,
  postDeepSeekJson,
  requiredString,
  unicodeLength,
  type ClientOptions,
  type JsonPrimitive,
} from "@pi-dstools/deepseek";

import type {
  DeepSeekSearchInput,
  DeepSeekSearchResponse,
  DeepSeekSearchResult,
  NormalizedSearchRequest,
} from "./types";

function validatedQuery(value: string): string {
  const length = unicodeLength(value);
  if (length < 1 || length > 128 || value.trim().length === 0) {
    throw new DeepSeekToolError(
      "query must contain 1 to 128 non-whitespace Unicode characters.",
      "validation",
    );
  }
  return value;
}

function validatedCount(value: number | undefined): number {
  const count = value ?? 10;
  if (!Number.isInteger(count) || count < 1 || count > 50) {
    throw new DeepSeekToolError("count must be an integer between 1 and 50.", "validation");
  }
  return count;
}

function validatedNeedContent(value: boolean | undefined): boolean {
  const needContent = value ?? false;
  if (typeof needContent !== "boolean") {
    throw new DeepSeekToolError("need_content must be a boolean.", "validation");
  }
  return needContent;
}

function oriQuestionField(input: DeepSeekSearchInput): { readonly ori_question?: string } {
  const value: unknown = input.ori_question;
  if (typeof value === "string") {
    const length = unicodeLength(value);
    if (length < 1 || length > 128 || value.trim().length === 0) {
      throw new DeepSeekToolError(
        "ori_question must contain 1 to 128 non-whitespace Unicode characters.",
        "validation",
      );
    }
    return { ori_question: value };
  }
  if (value !== undefined && value !== null) {
    throw new DeepSeekToolError("ori_question must be a string or null.", "validation");
  }
  return {};
}

function localizationField(input: DeepSeekSearchInput): { readonly localization?: string } {
  if (typeof input.localization === "string" && input.localization.trim().length > 0) {
    const localization = input.localization.trim();
    if (isIP(localization) === 0) {
      throw new DeepSeekToolError(
        "localization must be a valid IPv4 or IPv6 address.",
        "validation",
      );
    }
    return { localization };
  }
  if (input.localization !== undefined && typeof input.localization !== "string") {
    throw new DeepSeekToolError("localization must be a string.", "validation");
  }
  return {};
}

export function normalizeSearchInput(input: DeepSeekSearchInput): NormalizedSearchRequest {
  if (!isRecord(input) || typeof input.query !== "string") {
    throw new DeepSeekToolError("query must be a string.", "validation");
  }
  return {
    query: validatedQuery(input.query),
    count: validatedCount(input.count),
    need_content: validatedNeedContent(input.need_content),
    ...oriQuestionField(input),
    ...localizationField(input),
  };
}

function parseSearchResponse(payload: unknown): DeepSeekSearchResponse {
  if (!isRecord(payload) || !Array.isArray(payload.results)) {
    throw new DeepSeekToolError("DeepSeek Search API returned an invalid response.", "response");
  }

  const results = payload.results.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new DeepSeekToolError(
        `DeepSeek Search API result ${index + 1} is invalid.`,
        "response",
      );
    }
    return {
      rerank_score: finiteNumber(entry.rerank_score, "rerank_score", "Search"),
      title: requiredString(entry.title, "title", "Search"),
      url: requiredString(entry.url, "url", "Search"),
      snippet: requiredString(entry.snippet, "snippet", "Search"),
      summary: requiredString(entry.summary, "summary", "Search"),
      content: requiredString(entry.content, "content", "Search"),
      site_name: nullableString(entry.site_name, "site_name", "Search"),
      site_icon: nullableString(entry.site_icon, "site_icon", "Search"),
      date: nullableString(entry.date, "date", "Search"),
      authority: finiteNumber(entry.authority, "authority", "Search"),
    } satisfies DeepSeekSearchResult;
  });

  return { results };
}

export async function searchDeepSeek(
  input: DeepSeekSearchInput,
  apiKey: string,
  options: ClientOptions = {},
): Promise<DeepSeekSearchResponse> {
  if (!apiKey) {
    throw new DeepSeekToolError("Missing DeepSeek API key.", "auth");
  }

  const request = normalizeSearchInput(input);
  const body: Record<string, JsonPrimitive> = {
    query: request.query,
    count: request.count,
    need_content: request.need_content,
  };
  if (request.ori_question !== undefined) body.ori_question = request.ori_question;
  if (request.localization !== undefined) body.localization = request.localization;

  const payload = await postDeepSeekJson({
    ...options,
    endpoint: DEEPSEEK_SEARCH_URL,
    apiName: "Search",
    apiKey,
    body,
  });
  return parseSearchResponse(payload);
}
