import { displayContent, displayText, markdownLinkText } from "@pi-dstools/deepseek";

import type { FetchToolDetails } from "./types";

export function formatFetchForTui(
  details: FetchToolDetails,
  fullContent = "",
  _expanded?: boolean,
): string {
  const title = displayText(details.title).trim();
  const heading = markdownLinkText(title.length > 0 ? title : "Untitled page");
  if (details.contentPath !== undefined) {
    return `${heading} (${markdownLinkText(displayText(details.contentPath))})`;
  }
  const body =
    details.summary.trim().length === 0
      ? "Page content is empty."
      : fullContent.trim().length > 0
        ? displayContent(fullContent)
        : displayContent(details.summary);
  return [heading, body].join("\n");
}
