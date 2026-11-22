import { vi } from "vitest";

import {
  contentOptions,
  errorResponse,
  fakeFileSystem as fakeContentFileSystem,
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
import { EMPTY_STRUCTURED_CONTENT } from "../src/output";
import type { DsOcrDependencies } from "../src/tool";
import type {
  DeepSeekOcrResponse,
  NormalizedOcrRequest,
  OcrFileSystem,
  OcrToolDetails,
  PreparedOcrOutput,
} from "../src/types";

export {
  contentOptions,
  errorResponse,
  fakeContentFileSystem,
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

export function makeRequest(overrides: Partial<NormalizedOcrRequest> = {}): NormalizedOcrRequest {
  return {
    path: "/workspace/doc.pdf",
    filename: "doc.pdf",
    purpose: "text_recognition",
    ...overrides,
  };
}

export function makeOcrResponse(overrides: Partial<DeepSeekOcrResponse> = {}): DeepSeekOcrResponse {
  return {
    id: "ocr-1",
    object: "ocr.result",
    created: 1762790000,
    purpose: "text_recognition",
    page_count: 1,
    pages: [{ index: 0, text: "Hello", finish_reason: "stop" }],
    usage: { input_tokens: 10, output_tokens: 5, total_tokens: 15 },
    ...overrides,
  };
}

export function makeDetails(overrides: Partial<OcrToolDetails> = {}): OcrToolDetails {
  return {
    path: "/workspace/doc.pdf",
    filename: "doc.pdf",
    purpose: "text_recognition",
    pageCount: 1,
    summary: "Hello",
    ...overrides,
  };
}

export function makePrepared(response: DeepSeekOcrResponse): PreparedOcrOutput {
  return {
    contentText: "formatted OCR result",
    details: makeDetails({ pageCount: response.page_count }),
    structuredContent: response,
  };
}

export function makeDeps(overrides: Readonly<Partial<DsOcrDependencies>> = {}): DsOcrDependencies {
  return overrides;
}

export interface FakeOcrFileSystemOptions {
  readonly bytes?: readonly number[];
  readonly size?: number;
  readonly isFile?: boolean;
  readonly failStat?: boolean;
  readonly failRead?: boolean;
}

export function fakeOcrFileSystem(options: FakeOcrFileSystemOptions = {}): {
  readonly fs: OcrFileSystem;
  readonly stat: ReturnType<typeof vi.fn<OcrFileSystem["stat"]>>;
  readonly readFile: ReturnType<typeof vi.fn<OcrFileSystem["readFile"]>>;
  readonly bytes: readonly number[];
} {
  const bytes = options.bytes ?? Array.from(Buffer.from("hello"));
  const stat = vi.fn<OcrFileSystem["stat"]>(() =>
    options.failStat === true
      ? Promise.reject(new Error("stat failed"))
      : Promise.resolve({
          size: options.size ?? bytes.length,
          isFile: () => options.isFile ?? true,
        }),
  );
  const readFile = vi.fn<OcrFileSystem["readFile"]>(() =>
    options.failRead === true ? Promise.reject(new Error("read failed")) : Promise.resolve(bytes),
  );
  return { fs: { stat, readFile }, stat, readFile, bytes };
}

export function makeOcrContext(
  registry: ReturnType<typeof makeRegistry>["registry"],
  cwd = "/workspace",
): ReturnType<typeof makeContext> {
  return makeContext(registry, undefined, cwd);
}

export function formData(init: unknown): FormData {
  return hostCast<FormData>(fetchInit(init).body);
}

export function detailsOf(result: { readonly details?: unknown }): OcrToolDetails {
  return hostCast<OcrToolDetails>(result.details);
}

export const EMPTY_OCR_RESPONSE = EMPTY_STRUCTURED_CONTENT;
