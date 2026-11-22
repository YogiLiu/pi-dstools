import type { RetryProgress } from "@pi-dstools/deepseek";

export interface DeepSeekFetchInput {
  readonly url: string;
}

export interface NormalizedFetchRequest {
  readonly url: string;
}

export interface DeepSeekFetchResponse {
  readonly [key: string]: string;
  readonly title: string;
  readonly content: string;
}

export interface FetchToolDetails {
  readonly url: string;
  readonly title: string;
  readonly contentPath?: string;
  readonly summary: string;
  readonly error?: string;
  readonly retry?: RetryProgress;
}

export interface PreparedFetchOutput {
  readonly contentText: string;
  readonly details: FetchToolDetails;
  readonly structuredContent: DeepSeekFetchResponse;
}
