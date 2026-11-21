import { displayContent, splitContentLines } from "@pi-dstools/deepseek";

import type { HeadingEntry } from "./types";

interface Fence {
  readonly char: string;
  readonly length: number;
}

const ATX_HEADING = /^ {0,3}(#{1,6})(?:[ \t]+|$)(.*)$/u;
const FENCE_OPEN = /^ {0,3}(`{3,}|~{3,})/u;
const FENCE_CLOSE = /^ {0,3}(`+|~+)\s*$/u;
const TRAILING_HASHES = /[ \t]+#+[ \t]*$/u;
const HEADING_LIMIT = 80;

function fenceMarker(line: string): Fence | undefined {
  const match = FENCE_OPEN.exec(line);
  if (match === null) return undefined;
  const marker = String(match[1]);
  return { char: marker.charAt(0), length: marker.length };
}

function isClosingFence(line: string, fence: Fence): boolean {
  const match = FENCE_CLOSE.exec(line);
  if (match === null) return false;
  const marker = String(match[1]);
  return marker.charAt(0) === fence.char && marker.length >= fence.length;
}

function normalizedHeading(value: string): string {
  return displayContent(value).replace(TRAILING_HASHES, "").trim();
}

function truncatedHeading(value: string): string {
  const characters = Array.from(value);
  if (characters.length <= HEADING_LIMIT) return value;
  return `${characters.slice(0, HEADING_LIMIT).join("")}...`;
}

function tableHeading(value: string): string {
  return truncatedHeading(normalizedHeading(value)).replaceAll("|", "\\|");
}

export function extractHeadings(content: string): HeadingEntry[] {
  const entries: HeadingEntry[] = [];
  let fence: Fence | undefined;
  const lines = splitContentLines(content);

  for (const [index, line] of lines.entries()) {
    if (fence !== undefined) {
      if (isClosingFence(line, fence)) fence = undefined;
      continue;
    }
    const opening = fenceMarker(line);
    if (opening !== undefined) {
      fence = opening;
      continue;
    }
    const match = ATX_HEADING.exec(line);
    if (match === null) continue;
    const text = tableHeading(String(match[2]));
    if (text.length === 0) continue;
    entries.push({ line: index + 1, level: String(match[1]).length, text });
  }

  return entries;
}

export function formatHeadingTable(entries: readonly HeadingEntry[]): string {
  const rows = entries.map((entry) => `| L${entry.line} | H${entry.level} | ${entry.text} |`);
  return ["| Line | Level | Heading |", "| --- | --- | --- |", ...rows].join("\n");
}
