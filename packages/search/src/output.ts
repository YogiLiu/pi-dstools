import { join } from "node:path";

import {
  contentDirectory,
  resolveContentOptions,
  splitContentLines,
  writeContentFiles,
  type ContentOptions,
  type ContentWrite,
} from "@pi-dstools/deepseek";

import { formatResultsForModel, toResultDetails } from "./format";
import type {
  DeepSeekSearchResponse,
  NormalizedSearchRequest,
  PreparedSearchOutput,
  SearchResultDetails,
  SearchToolDetails,
} from "./types";

function collectRecords(
  request: NormalizedSearchRequest,
  response: DeepSeekSearchResponse,
  pageContentDir: string,
): { records: readonly SearchResultDetails[]; writes: readonly ContentWrite[] } {
  const writes: ContentWrite[] = [];
  const records = response.results.map((result, index) => {
    const record = toResultDetails(result, index);
    if (request.need_content && result.content.trim().length > 0) {
      const path = join(pageContentDir, `${index + 1}.md`);
      writes.push({ path, content: result.content });
      return {
        ...record,
        pageContentPath: path,
        pageContentLines: splitContentLines(result.content).length,
      };
    }
    return record;
  });
  return { records, writes };
}

export async function prepareSearchOutput(
  request: NormalizedSearchRequest,
  response: DeepSeekSearchResponse,
  options: ContentOptions = {},
): Promise<PreparedSearchOutput> {
  const { makeTempDir, makeUuid, fileSystem } = resolveContentOptions(options);
  const searchId = makeUuid();
  const pageContentDir = contentDirectory(makeTempDir(), "search", searchId);
  const { records, writes } = collectRecords(request, response, pageContentDir);
  await writeContentFiles(
    fileSystem,
    pageContentDir,
    writes,
    "Failed to save DeepSeek page content",
  );

  const details: SearchToolDetails = {
    query: request.query,
    resultCount: records.length,
    results: records,
    ...(writes.length > 0 ? { searchId, pageContentDir } : {}),
  };

  return {
    contentText: formatResultsForModel(records),
    details,
    structuredContent: response.results,
  };
}

export function createErrorDetails(query: string, message: string): SearchToolDetails {
  return {
    query,
    resultCount: 0,
    results: [],
    error: message,
  };
}
