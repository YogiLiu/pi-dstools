import { displayContent, displayText, markdownLinkText } from "@pi-dstools/deepseek";

import type { OcrToolDetails } from "./types";

export function formatOcrForTui(details: OcrToolDetails): string {
  const filename = displayText(details.filename).trim();
  const heading = markdownLinkText(filename.length > 0 ? filename : "Untitled document");
  const metadata = `Pages: ${details.pageCount} | Purpose: ${displayText(details.purpose)}`;
  if (details.contentPath !== undefined) {
    return [heading, metadata, markdownLinkText(displayText(details.contentPath))].join("\n");
  }
  const body =
    details.summary.trim().length === 0 ? "OCR result is empty." : displayContent(details.summary);
  return [heading, metadata, body].join("\n");
}
