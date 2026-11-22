import type { ClientOptions, RetryProgress } from "@pi-dstools/deepseek";

import { OCR_FINISH_REASONS, OCR_PURPOSES } from "./constants";

export type OcrPurpose = (typeof OCR_PURPOSES)[number];
export type OcrFinishReason = (typeof OCR_FINISH_REASONS)[number];

export interface DeepSeekOcrInput {
  readonly path: string;
  readonly purpose?: OcrPurpose;
}

export interface NormalizedOcrRequest {
  readonly path: string;
  readonly filename: string;
  readonly purpose: OcrPurpose;
}

export interface OcrFileStats {
  readonly size: number;
  readonly isFile: () => boolean;
}

export interface OcrFileSystem {
  readonly stat: (path: string) => Promise<OcrFileStats>;
  readonly readFile: (path: string) => Promise<readonly number[]>;
}

export interface OcrClientOptions extends ClientOptions {
  readonly fileSystem?: OcrFileSystem;
}

export type OcrPage = {
  readonly index: number;
  readonly text: string;
  readonly finish_reason: OcrFinishReason;
};

export type OcrUsage = {
  readonly input_tokens: number;
  readonly output_tokens: number;
  readonly total_tokens: number;
};

export type DeepSeekOcrResponse = {
  readonly id: string;
  readonly object: "ocr.result";
  readonly created: number;
  readonly purpose: OcrPurpose;
  readonly page_count: number;
  readonly pages: readonly OcrPage[];
  readonly usage: OcrUsage;
};

export interface OcrToolDetails {
  readonly path: string;
  readonly filename: string;
  readonly purpose: OcrPurpose;
  readonly pageCount: number;
  readonly summary: string;
  readonly contentPath?: string;
  readonly totalLines?: number;
  readonly error?: string;
  readonly retry?: RetryProgress;
}

export interface PreparedOcrOutput {
  readonly contentText: string;
  readonly details: OcrToolDetails;
  readonly structuredContent: DeepSeekOcrResponse;
}
