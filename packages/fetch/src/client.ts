import {
  DEEPSEEK_FETCH_URL,
  DeepSeekToolError,
  isRecord,
  postDeepSeekJson,
  requiredString,
  type ClientOptions,
} from "@pi-dstools/deepseek";
import { Check } from "typebox/value";

import { DS_FETCH_PARAMS } from "./schemas";
import type { DeepSeekFetchInput, DeepSeekFetchResponse, NormalizedFetchRequest } from "./types";

// oxlint-disable-next-line no-control-regex -- control characters are not valid in user-supplied URLs
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/u;

function invalidUrl(): DeepSeekToolError {
  return new DeepSeekToolError(
    "url must be an HTTP or HTTPS URL with a host and no username or password.",
    "validation",
  );
}

export function normalizeFetchInput(input: DeepSeekFetchInput): NormalizedFetchRequest {
  if (!isRecord(input) || typeof input.url !== "string") {
    throw new DeepSeekToolError("url must be a string.", "validation");
  }
  if (!Check(DS_FETCH_PARAMS, input)) {
    throw new DeepSeekToolError("url must contain 1 to 8192 characters.", "validation");
  }

  const url: string = input.url;
  if (url !== url.trim() || CONTROL_CHARACTERS.test(url)) throw invalidUrl();

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw invalidUrl();
  }
  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.host.length === 0 ||
    parsed.username.length > 0 ||
    parsed.password.length > 0
  ) {
    throw invalidUrl();
  }
  return { url };
}

function parseFetchResponse(payload: unknown): DeepSeekFetchResponse {
  if (!isRecord(payload)) {
    throw new DeepSeekToolError("DeepSeek Fetch API returned an invalid response.", "response");
  }
  return {
    title: requiredString(payload.title, "title", "Fetch"),
    content: requiredString(payload.content, "content", "Fetch"),
  };
}

export async function fetchDeepSeek(
  input: DeepSeekFetchInput,
  apiKey: string,
  options: ClientOptions = {},
): Promise<DeepSeekFetchResponse> {
  if (!apiKey) {
    throw new DeepSeekToolError("Missing DeepSeek API key.", "auth");
  }

  const request = normalizeFetchInput(input);
  const payload = await postDeepSeekJson({
    ...options,
    endpoint: DEEPSEEK_FETCH_URL,
    apiName: "Fetch",
    apiKey,
    body: { url: request.url },
  });
  return parseFetchResponse(payload);
}
