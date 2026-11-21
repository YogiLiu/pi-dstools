import type { ExtensionToolContext } from "@earendil-works/pi-coding-agent";
import { vi } from "vitest";

import {
  DEEPSEEK_OFFICIAL_ORIGIN,
  type ContentFileSystem,
  type ContentOptions,
  type CredentialRegistry,
  type DeepSeekFetch,
  type DeepSeekRequestInit,
  type HttpHeaders,
  type HttpResponse,
  type Sleep,
} from "../src/index";

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the call site chooses T, so it only appears in the return position
export function hostCast<T>(value: unknown): T {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- host types and malformed inputs cannot be constructed structurally
  return value as T;
}

function makeHeaders(
  values: Readonly<Record<string, string>> | undefined,
): HttpHeaders | undefined {
  if (values === undefined) return undefined;
  return { get: (name) => values[name.toLowerCase()] ?? null };
}

export function jsonResponse(payload: unknown): HttpResponse {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: () => Promise.resolve(payload),
    text: () => Promise.resolve(JSON.stringify(payload)),
  };
}

export function errorResponse(status: number, message: string): HttpResponse {
  return {
    ok: false,
    status,
    statusText: "Error",
    json: () => Promise.resolve({}),
    text: () =>
      Promise.resolve(
        JSON.stringify({
          error: {
            message,
            type: "invalid_request_error",
            param: null,
            code: "invalid_request_error",
          },
        }),
      ),
  };
}

export interface HttpFailureOptions {
  readonly status?: number;
  readonly statusText?: string;
  readonly body?: string;
  readonly failText?: boolean;
  readonly headers?: Readonly<Record<string, string>>;
}

export function httpFailure(options: HttpFailureOptions = {}): HttpResponse {
  const headers = makeHeaders(options.headers);
  return {
    ok: false,
    status: options.status ?? 500,
    statusText: options.statusText ?? "Error",
    ...(headers === undefined ? {} : { headers }),
    json: () => Promise.resolve({}),
    text: () =>
      options.failText === true
        ? Promise.reject(new Error("unreadable body"))
        : Promise.resolve(options.body ?? ""),
  };
}

export function fetchOnce(
  response: HttpResponse | (() => Promise<HttpResponse>),
): ReturnType<typeof vi.fn<DeepSeekFetch>> {
  return vi.fn<DeepSeekFetch>((_url, _init) =>
    typeof response === "function" ? response() : Promise.resolve(response),
  );
}

export function fetchSequence(
  responses: readonly HttpResponse[],
): ReturnType<typeof vi.fn<DeepSeekFetch>> {
  const fetchImpl = vi.fn<DeepSeekFetch>();
  for (const response of responses) fetchImpl.mockResolvedValueOnce(response);
  return fetchImpl;
}

export function instantSleep(): Sleep {
  return () => Promise.resolve();
}

export function throwNonError(value: unknown): never {
  throw value;
}

export function fakeFileSystem(
  options: { readonly failMkdir?: boolean; readonly failWrite?: boolean } = {},
): {
  readonly fs: ContentFileSystem;
  readonly mkdir: ReturnType<typeof vi.fn<ContentFileSystem["mkdir"]>>;
  readonly writeFile: ReturnType<typeof vi.fn<ContentFileSystem["writeFile"]>>;
} {
  const mkdir = vi.fn<ContentFileSystem["mkdir"]>((_path, _options) =>
    options.failMkdir === true ? Promise.reject(new Error("disk full")) : Promise.resolve(),
  );
  const writeFile = vi.fn<ContentFileSystem["writeFile"]>((_path, _data, _encoding) =>
    options.failWrite === true ? Promise.reject(new Error("disk full")) : Promise.resolve(),
  );
  const fs: ContentFileSystem = { mkdir, writeFile };
  return { fs, mkdir, writeFile };
}

export function contentOptions(fs: ContentFileSystem): ContentOptions {
  return { tmpdir: () => "/tmp", uuid: () => "uuid", fs };
}

export type RegistryAuth = Awaited<ReturnType<CredentialRegistry["getProviderAuth"]>>;

export interface RegistryOptions {
  readonly auth?: RegistryAuth | "unresolved";
  readonly providerBaseUrl?: string;
  readonly providerMissing?: boolean;
  readonly throwOnGetAuth?: unknown;
}

export function makeRegistry(options: RegistryOptions = {}) {
  const getProviderAuth = vi.fn<CredentialRegistry["getProviderAuth"]>(() => {
    if (options.throwOnGetAuth !== undefined) throwNonError(options.throwOnGetAuth);
    // oxlint-disable-next-line unicorn/no-useless-undefined -- the host API contract resolves undefined, not void
    if (options.auth === "unresolved") return Promise.resolve(undefined);
    return Promise.resolve(options.auth ?? { auth: { apiKey: "resolved-key" } });
  });
  const getProvider = vi.fn<CredentialRegistry["getProvider"]>(() => {
    // oxlint-disable-next-line unicorn/no-useless-undefined -- the host API returns undefined for a missing provider
    if (options.providerMissing === true) return undefined;
    return { baseUrl: options.providerBaseUrl ?? DEEPSEEK_OFFICIAL_ORIGIN };
  });
  const registry: CredentialRegistry = { getProvider, getProviderAuth };
  return { registry, getProvider, getProviderAuth };
}

export function makeContext(
  registry: CredentialRegistry,
  signal?: Readonly<AbortSignal>,
): ExtensionToolContext {
  return hostCast({ modelRegistry: registry, signal });
}

export function firstText(result: { readonly content: readonly unknown[] }): string {
  const first = result.content[0];
  const isText =
    typeof first === "object" &&
    first !== null &&
    "type" in first &&
    first.type === "text" &&
    "text" in first &&
    typeof first.text === "string";
  if (!isText) return "";
  const holder = hostCast<{ text: string }>(first);
  return holder.text;
}

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function rejectedSync(operation: () => void): unknown {
  try {
    operation();
  } catch (error) {
    return error;
  }
  throw new Error("expected the operation to throw");
}

export async function rejectedError(promise: Readonly<Promise<unknown>>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("expected the promise to reject");
}

// oxlint-disable-next-line typescript/no-unnecessary-type-parameters -- the call site chooses T for typed tool details
export function detailsOf<T>(result: { readonly details?: unknown }): T {
  return hostCast<T>(result.details);
}

export function requestBody(init: unknown): Record<string, unknown> {
  const holder = hostCast<{ body: string }>(init);
  return hostCast(JSON.parse(holder.body));
}

export function firstCall(mock: {
  readonly mock: { readonly calls: readonly unknown[] };
}): [unknown, unknown] {
  return hostCast(mock.mock.calls[0]);
}

export function fetchInit(init: unknown): DeepSeekRequestInit {
  return hostCast(init);
}

export function renderText(component: unknown): string {
  const renderable = hostCast<{ render: (width: number) => string[] } | undefined>(component);
  return renderable?.render(200).join("\n") ?? "";
}

interface RenderableTool {
  readonly renderCall?: (args: unknown, theme: unknown, context: unknown) => unknown;
  readonly renderResult?: (
    result: unknown,
    options: unknown,
    theme: unknown,
    context: unknown,
  ) => unknown;
}

export function renderCall(tool: unknown, args: unknown, theme: unknown): unknown {
  const renderable = hostCast<RenderableTool>(tool);
  return renderable.renderCall?.(args, theme, {});
}

export function renderResult(
  tool: unknown,
  result: unknown,
  options: unknown,
  theme: unknown,
): unknown {
  const renderable = hostCast<RenderableTool>(tool);
  return renderable.renderResult?.(result, options, theme, {});
}

export function plainTheme() {
  return {
    fg: (_token: string, text: string) => text,
    bold: (text: string) => text,
  };
}
