import { DEEPSEEK_SEARCH_URL, type HttpHeaders } from "../src/index";

export function headers(values: Readonly<Record<string, string>>): HttpHeaders {
  return { get: (name) => values[name.toLowerCase()] ?? null };
}

export function baseOptions() {
  return {
    endpoint: DEEPSEEK_SEARCH_URL,
    apiName: "Search" as const,
    apiKey: "key",
    body: { query: "DeepSeek" },
  };
}
