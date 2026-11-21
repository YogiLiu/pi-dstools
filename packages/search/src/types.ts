import type { RetryProgress } from "@pi-dstools/deepseek";

export type QualityLabel = "high" | "low";
export type AuthorityLabel = "high" | "low";

export interface DeepSeekSearchInput {
  readonly query: string;
  readonly count?: number;
  readonly ori_question?: string | null;
  readonly localization?: string;
  readonly need_content?: boolean;
}

export interface NormalizedSearchRequest {
  readonly query: string;
  readonly count: number;
  readonly need_content: boolean;
  readonly ori_question?: string;
  readonly localization?: string;
}

export type DeepSeekSearchResult = {
  readonly rerank_score: number;
  readonly title: string;
  readonly url: string;
  readonly snippet: string;
  readonly summary: string;
  readonly content: string;
  readonly site_name: string | null;
  readonly site_icon: string | null;
  readonly date: string | null;
  readonly authority: number;
};

export interface DeepSeekSearchResponse {
  readonly results: readonly DeepSeekSearchResult[];
}

export interface SearchResultDetails {
  readonly index: number;
  readonly title: string;
  readonly siteName: string | null;
  readonly url: string;
  readonly date: string | null;
  readonly snippet: string;
  readonly summary: string;
  readonly quality: QualityLabel;
  readonly authority: AuthorityLabel;
  readonly pageContentPath?: string;
  readonly pageContentLines?: number;
}

export interface SearchToolDetails {
  readonly query: string;
  readonly resultCount: number;
  readonly searchId?: string;
  readonly pageContentDir?: string;
  readonly results: readonly SearchResultDetails[];
  readonly error?: string;
  readonly retry?: RetryProgress;
}

export interface PreparedSearchOutput {
  readonly contentText: string;
  readonly details: SearchToolDetails;
  readonly structuredContent: readonly DeepSeekSearchResult[];
}

export interface TuiFormatOptions {
  readonly maxResults?: number;
}
