import { displayText, markdownLinkText, markdownLinkUrl } from "@pi-dstools/deepseek";

import type {
  AuthorityLabel,
  DeepSeekSearchResult,
  QualityLabel,
  SearchResultDetails,
  TuiFormatOptions,
} from "./types";

function metadataFallback(value: string | null): string {
  return value !== null && value.trim().length > 0 ? value : "unknown";
}

export function qualityLabel(score: number): QualityLabel {
  return score >= 1.5 ? "high" : "low";
}

export function authorityLabel(authority: number): AuthorityLabel {
  return authority >= 3 ? "high" : "low";
}

export function formatResultsForModel(records: readonly SearchResultDetails[]): string {
  if (records.length === 0) return "No results found.";

  return records
    .map((record) => {
      const lines = [
        `${record.index}. ${record.title}`,
        `Site: ${metadataFallback(record.siteName)} / ${record.url}`,
        `Date: ${metadataFallback(record.date)}`,
        `Quality: ${record.quality}`,
        `Authority: ${record.authority}`,
        `Summary: ${record.summary}`,
      ];
      if (record.pageContentPath !== undefined) {
        lines.push(`Page Content: ${record.pageContentPath}`);
        if (record.pageContentLines !== undefined) {
          lines.push(`Total Lines: ${record.pageContentLines}`);
        }
      }
      return lines.join("\n");
    })
    .join("\n\n");
}

export function formatResultsForTui(
  records: readonly SearchResultDetails[],
  options: TuiFormatOptions = {},
): string {
  if (records.length === 0) return "No results found.";

  const limit =
    options.maxResults !== undefined && options.maxResults > 0
      ? options.maxResults
      : records.length;
  const visible = records.slice(0, limit);
  const lines = visible.flatMap((record) => [
    `${record.index}. [${markdownLinkText(record.title)}](${markdownLinkUrl(record.url)})`,
    `   ${displayText(metadataFallback(record.siteName))} / ${displayText(metadataFallback(record.date))}`,
    displayText(record.snippet),
    "",
  ]);
  if (lines.at(-1) === "") lines.pop();

  const hidden = records.length - visible.length;
  if (hidden > 0) {
    lines.push("", `... ${hidden} more results (expand to view all)`);
  }
  return lines.join("\n");
}

export function toResultDetails(result: DeepSeekSearchResult, index: number): SearchResultDetails {
  return {
    index: index + 1,
    title: result.title,
    siteName: result.site_name,
    url: result.url,
    date: result.date,
    snippet: result.snippet,
    summary: result.summary,
    quality: qualityLabel(result.rerank_score),
    authority: authorityLabel(result.authority),
  };
}
