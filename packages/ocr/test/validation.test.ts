import { parse, resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { isOcrPurpose, normalizeOcrInput } from "../src/client";

const CWD = "/workspace";

function acceptsRelativeAbsoluteAndAtPrefixedPaths() {
  const relative = resolve(CWD, "docs/report.pdf");
  expect(normalizeOcrInput({ path: "docs/report.pdf" }, CWD)).toEqual({
    path: relative,
    filename: "report.pdf",
    purpose: "text_recognition",
  });
  expect(normalizeOcrInput({ path: "@docs/report.pdf" }, CWD)).toEqual({
    path: relative,
    filename: "report.pdf",
    purpose: "text_recognition",
  });
  const absolute = resolve(CWD, "image.png");
  expect(normalizeOcrInput({ path: absolute, purpose: "rich_layout_recognition" }, CWD)).toEqual({
    path: absolute,
    filename: "image.png",
    purpose: "rich_layout_recognition",
  });
}

function rejectsMalformedPathsPurposesAndRootPaths() {
  const invalid: readonly unknown[] = [
    null,
    [],
    { path: 42 },
    { path: "" },
    { path: "   " },
    { path: "@  " },
    { path: "a\u0001b" },
    { path: "doc.pdf", purpose: 42 },
    { path: "doc.pdf", purpose: null },
    { path: "doc.pdf", purpose: "invalid" },
    { path: parse(CWD).root },
  ];
  for (const input of invalid) {
    expect(() => normalizeOcrInput(input, CWD)).toThrow(/path|purpose/u);
  }
}

function recognizesSupportedPurposes() {
  expect(isOcrPurpose("text_recognition")).toBe(true);
  expect(isOcrPurpose("rich_layout_recognition")).toBe(true);
  expect(isOcrPurpose("invalid")).toBe(false);
  expect(isOcrPurpose(42)).toBe(false);
}

describe("OCR input normalization", () => {
  it("accepts relative, absolute, and @-prefixed paths", acceptsRelativeAbsoluteAndAtPrefixedPaths);
  it(
    "rejects malformed paths, purposes, and root paths",
    rejectsMalformedPathsPurposesAndRootPaths,
  );
  it("recognizes supported purposes", recognizesSupportedPurposes);
});
