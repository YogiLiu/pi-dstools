import { DEFAULT_RETRY_DELAYS_MS, MAX_RETRY_DELAY_MS, MAX_TOOL_RETRIES } from "./constants";
import { DeepSeekToolError, errorMessage, isAbortError, isRecord } from "./errors";
import type {
  DeepSeekRequestBody,
  DeepSeekRequestInit,
  HttpHeaders,
  HttpResponse,
  PostDeepSeekFormDataOptions,
  PostDeepSeekJsonOptions,
  PostDeepSeekRequestOptions,
  ToolApiName,
} from "./types";

function abortError(): Error {
  const error = new Error("DeepSeek request was cancelled.");
  error.name = "AbortError";
  return error;
}

export function defaultSleep(delayMs: number, signal?: Readonly<AbortSignal>): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(abortError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

export function retryDelayMs(
  headers: HttpHeaders | undefined,
  retryIndex: number,
  now: number,
): number {
  const milliseconds = headers?.get("retry-after-ms");
  if (milliseconds !== undefined && milliseconds !== null) {
    const parsed = Number(milliseconds);
    if (Number.isFinite(parsed) && parsed >= 0) {
      return Math.min(Math.max(parsed, 0), MAX_RETRY_DELAY_MS);
    }
  }

  const retryAfter = headers?.get("retry-after");
  if (retryAfter !== undefined && retryAfter !== null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) {
      if (seconds >= 0) return Math.min(Math.max(seconds * 1000, 0), MAX_RETRY_DELAY_MS);
    } else {
      const date = Date.parse(retryAfter);
      if (Number.isFinite(date)) return Math.min(Math.max(date - now, 0), MAX_RETRY_DELAY_MS);
    }
  }

  return DEFAULT_RETRY_DELAYS_MS[retryIndex] ?? 1000;
}

function buildRequestInit(
  body: DeepSeekRequestBody,
  apiKey: string,
  signal: Readonly<AbortSignal> | undefined,
  headers: Readonly<Record<string, string>>,
): DeepSeekRequestInit {
  return {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...headers,
    },
    body,
    ...(signal === undefined ? {} : { signal }),
  };
}

async function readHttpError(response: HttpResponse, apiName: ToolApiName): Promise<string> {
  let rawBody: string;
  try {
    rawBody = await response.text();
  } catch {
    rawBody = "";
  }

  let providerMessage = "";
  if (rawBody) {
    try {
      const parsed: unknown = JSON.parse(rawBody);
      if (isRecord(parsed) && isRecord(parsed.error) && typeof parsed.error.message === "string") {
        providerMessage = parsed.error.message.trim();
      }
    } catch {
      providerMessage = rawBody.trim();
    }
  }

  if (response.status === 401) {
    return "DeepSeek rejected the API key Pi resolved for its DeepSeek provider.";
  }
  if (response.status === 402) {
    return "DeepSeek account has insufficient balance.";
  }
  if (response.status === 429) {
    return `DeepSeek ${apiName} API rate limit exceeded.`;
  }

  const status = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`;
  const detail = providerMessage ? `: ${providerMessage.slice(0, 500)}` : "";
  return `DeepSeek ${apiName} API returned ${status}${detail}`;
}

async function parseJsonPayload(response: HttpResponse, apiName: ToolApiName): Promise<unknown> {
  try {
    return await response.json();
  } catch (error) {
    throw new DeepSeekToolError(
      `DeepSeek ${apiName} API returned invalid JSON: ${errorMessage(error)}`,
      "parse",
    );
  }
}

function asClientError(
  error: unknown,
  apiName: ToolApiName,
  signal: Readonly<AbortSignal> | undefined,
): DeepSeekToolError {
  if (error instanceof DeepSeekToolError) return error;
  if (isAbortError(error, signal)) {
    return new DeepSeekToolError(`DeepSeek ${apiName.toLowerCase()} was cancelled.`, "aborted");
  }
  return new DeepSeekToolError(
    `DeepSeek ${apiName} request failed: ${errorMessage(error)}`,
    "network",
  );
}

function postDeepSeekRequest(options: PostDeepSeekRequestOptions): Promise<unknown> {
  if (!options.apiKey) {
    throw new DeepSeekToolError("Missing DeepSeek API key.", "auth");
  }

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const sleepImpl = options.sleep ?? defaultSleep;
  const now = options.now ?? Date.now;

  const attemptRequest = async (attempt: number): Promise<unknown> => {
    try {
      options.signal?.throwIfAborted();
      const response = await fetchImpl(
        options.endpoint,
        buildRequestInit(options.body, options.apiKey, options.signal, options.headers),
      );
      if (!response.ok) {
        const message = await readHttpError(response, options.apiName);
        const error = new DeepSeekToolError(message, "http", response.status);
        if (attempt < MAX_TOOL_RETRIES && isRetryableStatus(response.status)) {
          const delayMs = retryDelayMs(response.headers, attempt, now());
          options.onRetry?.({
            attempt: attempt + 1,
            maxRetries: MAX_TOOL_RETRIES,
            status: response.status,
            delayMs,
          });
          await sleepImpl(delayMs, options.signal);
          return await attemptRequest(attempt + 1);
        }
        throw error;
      }
      return await parseJsonPayload(response, options.apiName);
    } catch (error) {
      throw asClientError(error, options.apiName, options.signal);
    }
  };

  return attemptRequest(0);
}

export function postDeepSeekJson(options: PostDeepSeekJsonOptions): Promise<unknown> {
  const { body, ...requestOptions } = options;
  return postDeepSeekRequest({
    ...requestOptions,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

export function postDeepSeekFormData(options: PostDeepSeekFormDataOptions): Promise<unknown> {
  const { formData, ...requestOptions } = options;
  return postDeepSeekRequest({
    ...requestOptions,
    body: formData,
    headers: {},
  });
}
