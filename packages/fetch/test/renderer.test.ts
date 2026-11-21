import { Markdown, setCapabilityOverrides, Text } from "@earendil-works/pi-tui";
import { describe, expect, it } from "vitest";

import { createErrorDetails } from "../src/output";
import { createDsFetchTool } from "../src/tool";
import {
  hostCast,
  makeDetails,
  makeFetchResponse,
  plainTheme,
  renderCall,
  renderResult,
  renderText,
} from "./helpers";

const URL = "https://example.com/article";
const CONTENT_PATH = "/tmp/pi-dstools/fetch/uuid/page.md";

function rendersCallComponent() {
  const component = renderCall(createDsFetchTool(), { url: URL }, plainTheme());
  expect(component).toBeInstanceOf(Text);
  expect(renderText(component)).toContain(`ds_fetch "${URL}"`);
}

function truncatesLongUrls() {
  const url = `https://example.com/${"x".repeat(100)}`;
  const component = renderCall(createDsFetchTool(), { url }, plainTheme());
  expect(renderText(component)).toContain(`"${url.slice(0, 77)}..."`);
}

function rendersTitleAndContentPathRegardlessOfExpansion() {
  setCapabilityOverrides({ hyperlinks: false });
  const tool = createDsFetchTool();
  const result = {
    content: [{ type: "text", text: "formatted" }],
    details: makeDetails({ summary: "Summary", contentPath: CONTENT_PATH }),
    structuredContent: makeFetchResponse({ content: "Saved page body" }),
  };
  const collapsed = renderResult(tool, result, { expanded: false, isPartial: false }, plainTheme());
  const expanded = renderResult(tool, result, { expanded: true, isPartial: false }, plainTheme());
  expect(collapsed).toBeInstanceOf(Markdown);
  expect(renderText(collapsed)).toContain(`Example article (${CONTENT_PATH})`);
  expect(renderText(collapsed)).not.toContain(URL);
  expect(renderText(collapsed)).not.toContain("Summary");
  expect(renderText(collapsed)).not.toContain("Saved page body");
  expect(renderText(collapsed)).not.toContain("Page content is empty.");
  expect(renderText(expanded)).toBe(renderText(collapsed));
}

function rendersTitleAndContentPathWithoutStructuredContentRegardlessOfExpansion() {
  setCapabilityOverrides({ hyperlinks: false });
  const tool = createDsFetchTool();
  const result = {
    content: [{ type: "text", text: "ignored" }],
    details: makeDetails({ summary: "Summary", contentPath: CONTENT_PATH }),
  };
  const collapsed = renderResult(tool, result, { expanded: false, isPartial: false }, plainTheme());
  const expanded = renderResult(tool, result, { expanded: true, isPartial: false }, plainTheme());
  expect(renderText(collapsed)).toContain(`Example article (${CONTENT_PATH})`);
  expect(renderText(collapsed)).not.toContain(URL);
  expect(renderText(collapsed)).not.toContain("Summary");
  expect(renderText(collapsed)).not.toContain("ignored");
  expect(renderText(collapsed)).not.toContain("Page content is empty.");
  expect(renderText(expanded)).toBe(renderText(collapsed));
}

function rendersTitleAndFullContentWithoutAContentPathRegardlessOfExpansion() {
  setCapabilityOverrides({ hyperlinks: false });
  const tool = createDsFetchTool();
  const result = {
    content: [{ type: "text", text: "ignored" }],
    details: makeDetails({ summary: "Summary" }),
    structuredContent: makeFetchResponse({ content: "# Full\n\nText" }),
  };
  const collapsed = renderResult(tool, result, { expanded: false, isPartial: false }, plainTheme());
  const expanded = renderResult(tool, result, { expanded: true, isPartial: false }, plainTheme());
  expect(renderText(collapsed)).toContain("Example article");
  expect(renderText(collapsed)).toContain("Full");
  expect(renderText(collapsed)).toContain("Text");
  expect(renderText(collapsed)).not.toContain(URL);
  expect(renderText(collapsed)).not.toContain("Summary");
  expect(renderText(collapsed)).not.toContain("Page content is empty.");
  expect(renderText(expanded)).toBe(renderText(collapsed));
}

function rendersTitleAndSummaryWithoutAContentPathRegardlessOfExpansion() {
  setCapabilityOverrides({ hyperlinks: false });
  const tool = createDsFetchTool();
  const result = {
    content: [{ type: "text", text: "ignored" }],
    details: makeDetails({ summary: "# Short\n\nText" }),
  };
  const collapsed = renderResult(tool, result, { expanded: false, isPartial: false }, plainTheme());
  const expanded = renderResult(tool, result, { expanded: true, isPartial: false }, plainTheme());
  expect(renderText(collapsed)).toContain("Example article");
  expect(renderText(collapsed)).toContain("Short");
  expect(renderText(collapsed)).toContain("Text");
  expect(renderText(collapsed)).not.toContain(URL);
  expect(renderText(collapsed)).not.toContain("Page content is empty.");
  expect(renderText(expanded)).toBe(renderText(collapsed));
}

function fallsBackToTitleAndSummaryForMalformedStructuredContent() {
  setCapabilityOverrides({ hyperlinks: false });
  const tool = createDsFetchTool();
  const result = {
    content: [{ type: "text", text: "ignored" }],
    details: makeDetails({ summary: "Summary" }),
    structuredContent: { content: 42 },
  };
  const collapsed = renderResult(tool, result, { expanded: false, isPartial: false }, plainTheme());
  const expanded = renderResult(tool, result, { expanded: true, isPartial: false }, plainTheme());
  expect(renderText(collapsed)).toContain("Example article");
  expect(renderText(collapsed)).toContain("Summary");
  expect(renderText(collapsed)).not.toContain(URL);
  expect(renderText(collapsed)).not.toContain("ignored");
  expect(renderText(collapsed)).not.toContain("Page content is empty.");
  expect(renderText(expanded)).toBe(renderText(collapsed));
}

function rendersEmptyContentAndMalformedStructuredContent() {
  setCapabilityOverrides({ hyperlinks: false });
  const tool = createDsFetchTool();
  const details = makeDetails({ summary: "" });
  const blank = renderResult(
    tool,
    { content: [], details, structuredContent: makeFetchResponse({ content: "   " }) },
    { expanded: false, isPartial: false },
    plainTheme(),
  );
  expect(renderText(blank)).toContain("Example article");
  expect(renderText(blank)).toContain("Page content is empty.");

  const malformed = renderResult(
    tool,
    { content: [], details, structuredContent: { content: 42 } },
    { expanded: true, isPartial: false },
    plainTheme(),
  );
  expect(renderText(malformed)).toContain("Example article");
  expect(renderText(malformed)).toContain("Page content is empty.");
}

function rendersPartialAndErrorStates() {
  const tool = createDsFetchTool();
  const partial = renderResult(
    tool,
    { content: [], details: makeDetails(), structuredContent: makeFetchResponse() },
    { expanded: false, isPartial: true },
    plainTheme(),
  );
  expect(renderText(partial)).toContain("Fetching...");

  const malformedPartial = renderResult(
    tool,
    { content: [], details: hostCast({ unexpected: true }), structuredContent: {} },
    { expanded: false, isPartial: true },
    plainTheme(),
  );
  expect(renderText(malformedPartial)).toContain("Fetching...");

  const error = renderResult(
    tool,
    {
      content: [],
      details: createErrorDetails(URL, "failed"),
      structuredContent: { title: "", content: "" },
      isError: true,
    },
    { expanded: false, isPartial: false },
    plainTheme(),
  );
  expect(error).toBeInstanceOf(Text);
  expect(renderText(error)).toContain("Error: failed");

  const malformedFinal = renderResult(
    tool,
    {
      content: [],
      details: hostCast({ unexpected: true }),
      structuredContent: makeFetchResponse(),
    },
    { expanded: false, isPartial: false },
    plainTheme(),
  );
  expect(renderText(malformedFinal)).toContain("Error: No fetch details available.");
}

describe("ds_fetch pi-tui renderers", () => {
  it("renders calls", rendersCallComponent);
  it("truncates long URLs", truncatesLongUrls);
  it(
    "renders the title and content path regardless of expansion",
    rendersTitleAndContentPathRegardlessOfExpansion,
  );
  it(
    "renders the title and content path without structured content regardless of expansion",
    rendersTitleAndContentPathWithoutStructuredContentRegardlessOfExpansion,
  );
  it(
    "renders the title and full content without a content path regardless of expansion",
    rendersTitleAndFullContentWithoutAContentPathRegardlessOfExpansion,
  );
  it(
    "renders the title and summary without a content path regardless of expansion",
    rendersTitleAndSummaryWithoutAContentPathRegardlessOfExpansion,
  );
  it(
    "falls back to the title and summary for malformed structured content",
    fallsBackToTitleAndSummaryForMalformedStructuredContent,
  );
  it(
    "renders empty content and malformed structured content",
    rendersEmptyContentAndMalformedStructuredContent,
  );
  it("renders partial and error states", rendersPartialAndErrorStates);
});
