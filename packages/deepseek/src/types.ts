export type ToolApiName = "Search" | "Fetch";

export type DeepSeekToolErrorKind =
  | "auth"
  | "endpoint"
  | "validation"
  | "http"
  | "network"
  | "parse"
  | "response"
  | "aborted"
  | "filesystem";

export type JsonPrimitive = string | number | boolean | null;

export interface ToolIdentity {
  readonly toolName: string;
  readonly apiName: ToolApiName;
}

export interface CredentialRegistry {
  readonly getProvider: (provider: string) => { readonly baseUrl?: string } | undefined;
  readonly getProviderAuth: (
    provider: string,
  ) => Promise<{ readonly auth: { readonly apiKey?: string } } | undefined>;
}

export interface DeepSeekToolContext {
  readonly modelRegistry: CredentialRegistry;
  readonly signal: Readonly<AbortSignal> | undefined;
}

export interface PreparedToolCall {
  readonly apiKey: string;
  readonly signal: Readonly<AbortSignal> | undefined;
}

export interface HttpHeaders {
  readonly get: (name: string) => string | null;
}

export interface HttpResponse {
  readonly ok: boolean;
  readonly status: number;
  readonly statusText: string;
  readonly headers?: HttpHeaders;
  readonly json: () => Promise<unknown>;
  readonly text: () => Promise<string>;
}

export interface DeepSeekRequestInit {
  readonly method: "POST";
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
  readonly signal?: Readonly<AbortSignal>;
}

export type DeepSeekFetch = (url: string, init: DeepSeekRequestInit) => Promise<HttpResponse>;

export interface RetryProgress {
  readonly attempt: number;
  readonly maxRetries: number;
  readonly status: number;
}

export interface RetryEvent extends RetryProgress {
  readonly delayMs: number;
}

export type Sleep = (delayMs: number, signal?: Readonly<AbortSignal>) => Promise<void>;

export interface ClientOptions {
  readonly signal?: Readonly<AbortSignal>;
  readonly fetchImpl?: DeepSeekFetch;
  readonly sleep?: Sleep;
  readonly now?: () => number;
  readonly onRetry?: (event: RetryEvent) => void;
}

export interface PostDeepSeekJsonOptions extends ClientOptions {
  readonly endpoint: string;
  readonly apiName: ToolApiName;
  readonly apiKey: string;
  readonly body: Readonly<Record<string, JsonPrimitive>>;
}

export interface ContentFileSystem {
  readonly mkdir: (path: string, options: { readonly recursive: true }) => Promise<void>;
  readonly writeFile: (path: string, data: string, encoding: "utf8") => Promise<void>;
}

export interface ContentWrite {
  readonly path: string;
  readonly content: string;
}

export interface ContentOptions {
  readonly tmpdir?: () => string;
  readonly uuid?: () => string;
  readonly fs?: ContentFileSystem;
}

export interface ResolvedContentOptions {
  readonly makeTempDir: () => string;
  readonly makeUuid: () => string;
  readonly fileSystem: ContentFileSystem;
}
