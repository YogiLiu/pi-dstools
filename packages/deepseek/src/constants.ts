export const DEEPSEEK_PROVIDER_ID = "deepseek";
export const DEEPSEEK_OFFICIAL_ORIGIN = "https://api.deepseek.com";
export const DEEPSEEK_SEARCH_URL = `${DEEPSEEK_OFFICIAL_ORIGIN}/v1/tools/search`;
export const DEEPSEEK_FETCH_URL = `${DEEPSEEK_OFFICIAL_ORIGIN}/v1/tools/fetch`;

export const MAX_TOOL_RETRIES = 2;
export const DEFAULT_RETRY_DELAYS_MS = [500, 1000] as const;
export const MAX_RETRY_DELAY_MS = 60_000;
