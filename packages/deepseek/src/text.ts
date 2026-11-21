import type { RetryProgress } from "./types";

// oxlint-disable-next-line no-control-regex -- terminal control characters must be stripped from untrusted remote text
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]+/gu;
// oxlint-disable-next-line no-control-regex -- terminal control characters must be stripped from untrusted remote text
const CONTENT_CONTROL_CHARACTERS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]+/gu;
const CONTENT_LINE_BREAKS = /\r\n|\n|\r/u;

export function displayText(value: string): string {
  return value.replaceAll(CONTROL_CHARACTERS, " ");
}

export function displayContent(value: string): string {
  return value.replaceAll(CONTENT_CONTROL_CHARACTERS, " ");
}

export function markdownLinkText(value: string): string {
  return displayText(value).replaceAll("\\", "\\\\").replaceAll("[", "\\[").replaceAll("]", "\\]");
}

export function markdownLinkUrl(value: string): string {
  return value
    .replaceAll(CONTROL_CHARACTERS, "")
    .replaceAll(/\s+/gu, "%20")
    .replaceAll("\\", "\\\\")
    .replaceAll("(", "\\(")
    .replaceAll(")", "\\)");
}

export function truncateText(value: string, maxLength = 80): string {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
}

export function unicodeLength(value: string): number {
  return Array.from(value).length;
}

export function splitContentLines(value: string): string[] {
  return value.split(CONTENT_LINE_BREAKS);
}

export function retryMessage(progress: RetryProgress): string {
  return `Retrying (${progress.attempt}/${progress.maxRetries}) after HTTP ${progress.status}...`;
}
