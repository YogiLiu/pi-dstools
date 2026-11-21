import { Markdown, setCapabilityOverrides, Text } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";

import { createErrorDetails } from "../src/output";
import { createDsSearchTool } from "../src/tool";
import type { SearchToolDetails } from "../src/types";
import { hostCast, makeResult, plainTheme, renderCall, renderResult, renderText } from "./helpers";

function makeDetails(): SearchToolDetails {
  return {
    query: "DeepSeek",
    resultCount: 1,
    results: [
      {
        index: 1,
        title: "DeepSeek V4",
        siteName: "Example News",
        url: "https://example.com/deepseek-v4",
        date: "2026-06-01",
        snippet: "A short snippet.",
        summary: "A model-readable summary.",
        quality: "high",
        authority: "high",
      },
    ],
  };
}

function successResult(details: SearchToolDetails) {
  return {
    content: [{ type: "text", text: "formatted" }],
    details,
    structuredContent: [makeResult()],
  };
}

function rendersCallComponent() {
  const component = renderCall(createDsSearchTool(), { query: "DeepSeek", count: 5 }, plainTheme());
  expect(component).toBeInstanceOf(Text);
  expect(renderText(component)).toContain('ds_search "DeepSeek"');
}

function rendersResultComponent() {
  const component = renderResult(
    createDsSearchTool(),
    successResult(makeDetails()),
    { expanded: true, isPartial: false },
    plainTheme(),
  );
  expect(component).toBeInstanceOf(Markdown);
  const text = renderText(component);
  expect(text).toContain("1. DeepSeek V4");
  expect(text).toContain("Example News / 2026-06-01");
  expect(text).toContain("A short snippet.");
}

function rendersHyperlinksWhenSupported() {
  setCapabilityOverrides({ hyperlinks: true });
  const component = renderResult(
    createDsSearchTool(),
    successResult(makeDetails()),
    { expanded: true, isPartial: false },
    plainTheme(),
  );
  const text = renderText(component);
  expect(text).toContain("\u001B]8;;https://example.com/deepseek-v4\u001B\\DeepSeek V4");
  expect(text).not.toContain(" (https://example.com/deepseek-v4)");
}

function rendersPartialAndErrorStates() {
  const tool = createDsSearchTool();
  const partial = renderResult(
    tool,
    { content: [{ type: "text", text: "" }], details: makeDetails(), structuredContent: [] },
    { expanded: false, isPartial: true },
    plainTheme(),
  );
  expect(renderText(partial)).toContain("Searching...");

  const error = renderResult(
    tool,
    {
      content: [{ type: "text", text: "failed" }],
      details: createErrorDetails("DeepSeek", "failed"),
      structuredContent: [],
      isError: true,
    },
    { expanded: false, isPartial: false },
    plainTheme(),
  );
  expect(renderText(error)).toContain("Error: failed");
}

function rendersPartialWithMalformedDetails() {
  const component = renderResult(
    createDsSearchTool(),
    {
      content: [],
      details: hostCast({ unexpected: true }),
      structuredContent: [],
    },
    { expanded: false, isPartial: true },
    plainTheme(),
  );
  expect(renderText(component)).toContain("Searching...");
}

function truncatesLongQueries() {
  const component = renderCall(
    createDsSearchTool(),
    { query: "x".repeat(100), count: undefined },
    plainTheme(),
  );
  expect(component).toBeInstanceOf(Text);
  const text = renderText(component);
  expect(text).toContain(`"${"x".repeat(77)}..."`);
  expect(text).toContain("(count=10)");
}

function showsStableErrorForMalformedDetails() {
  const theme = { fg: (_token: string, text: string) => text };
  const component = renderResult(
    createDsSearchTool(),
    {
      content: [{ type: "text", text: "formatted" }],
      details: { unexpected: true },
      structuredContent: [],
    },
    { expanded: false, isPartial: false },
    theme,
  );
  expect(component).toBeInstanceOf(Text);
  expect(renderText(component)).toContain("Error: No search details available.");
}

function makeFourResultDetails(): SearchToolDetails {
  const records = Array.from({ length: 4 }, (_, index) => ({
    index: index + 1,
    title: `Title ${index + 1}`,
    siteName: "Example News",
    url: `https://example.com/${index + 1}`,
    date: "2026-06-01",
    snippet: `Snippet ${index + 1}`,
    summary: `Summary ${index + 1}`,
    quality: "high" as const,
    authority: "high" as const,
  }));
  return { query: "DeepSeek", resultCount: 4, results: records };
}

function limitsCollapsedResults() {
  setCapabilityOverrides({ hyperlinks: false });
  const tool = createDsSearchTool();
  const theme = { fg: (_token: string, text: string) => text };
  const render = (expanded: boolean) =>
    renderText(
      renderResult(
        tool,
        { content: [], details: makeFourResultDetails(), structuredContent: [] },
        { expanded, isPartial: false },
        theme,
      ),
    );
  expect(render(false)).toContain("... 1 more results (expand to view all)");
  expect(render(false)).not.toContain("4. Title 4");
  expect(render(true)).toContain("4. Title 4");
}

function styledDetails(): SearchToolDetails {
  return {
    query: "DeepSeek",
    resultCount: 1,
    results: [
      {
        index: 1,
        title: "DeepSeek V4",
        siteName: "Example News",
        url: "https://example.com/deepseek-v4",
        date: "2026-06-01",
        snippet: "**bold** *italic* ~~deleted~~ `code`",
        summary: "A model-readable summary.",
        quality: "high",
        authority: "high",
      },
    ],
  };
}

function fullTheme() {
  return {
    fg: (_token: string, text: string) => `<fg>${text}</fg>`,
    bold: (text: string) => `${text}<B>`,
    italic: (text: string) => `${text}<I>`,
    strikethrough: (text: string) => `${text}<S>`,
    underline: (text: string) => `${text}<U>`,
  };
}

function renderWithTheme(theme: object): string {
  return renderText(
    renderResult(
      createDsSearchTool(),
      { content: [], details: styledDetails(), structuredContent: [] },
      { expanded: true, isPartial: false },
      theme,
    ),
  );
}

function stylesMarkdownText() {
  setCapabilityOverrides({ hyperlinks: false });
  const text = renderWithTheme(fullTheme());
  expect(text).toContain("<fg>code</fg>");
  expect(text).toContain("<fg>");
  expect(text).toContain("<B>");
  expect(text).toContain("<I>");
  expect(text).toContain("<S>");
  expect(text).toContain("<U>");
  expect(text).toContain("https://example.com/deepseek-v4");
}

function degradesToPlainText() {
  setCapabilityOverrides({ hyperlinks: false });
  const theme = { fg: (_token: string, text: string) => text };
  const text = renderWithTheme(theme);
  expect(text).toContain("DeepSeek V4");
  expect(text).toContain("bold");
  expect(text).not.toContain("<fg>");
  expect(text).not.toContain("<B>");
  expect(text).not.toContain("<U>");
}

describe("pi-tui renderer integration", () => {
  it("uses pi-tui renderers for calls", rendersCallComponent);
  it("uses pi-tui renderers for results", rendersResultComponent);
  it("renders hyperlinks when the terminal supports them", rendersHyperlinksWhenSupported);
  it("renders partial and error states", rendersPartialAndErrorStates);
});

describe("renderer contracts", () => {
  it("truncates long queries and defaults an omitted count", truncatesLongQueries);
  it("keeps the default partial state for malformed details", rendersPartialWithMalformedDetails);
  it(
    "shows a stable error when renderer details are malformed",
    showsStableErrorForMalformedDetails,
  );
  it(
    "limits collapsed results to three and shows all results when expanded",
    limitsCollapsedResults,
  );
  it("styles Markdown result text", stylesMarkdownText);
  it("degrades to plain text for lightweight themes", degradesToPlainText);
});
