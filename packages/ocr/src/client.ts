import { File } from "node:buffer";
import { readFile as diskReadFile, stat as diskStat } from "node:fs/promises";
import { basename, resolve } from "node:path";

import {
  DEEPSEEK_OCR_URL,
  DeepSeekToolError,
  errorMessage,
  finiteNumber,
  isRecord,
  postDeepSeekFormData,
  requiredString,
} from "@pi-dstools/deepseek";
import { Check } from "typebox/value";

import {
  DEFAULT_OCR_PURPOSE,
  MAX_OCR_FILE_BYTES,
  OCR_FINISH_REASONS,
  OCR_PURPOSES,
  OCR_RESULT_OBJECT,
} from "./constants";
import { DS_OCR_PARAMS } from "./schemas";
import type {
  DeepSeekOcrResponse,
  NormalizedOcrRequest,
  OcrClientOptions,
  OcrFileStats,
  OcrFileSystem,
  OcrFinishReason,
  OcrPage,
  OcrPurpose,
} from "./types";

// oxlint-disable-next-line no-control-regex -- control characters are not valid in local file paths
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/u;

export const DEFAULT_OCR_FILE_SYSTEM: OcrFileSystem = {
  stat(path) {
    return diskStat(path);
  },
  async readFile(path) {
    return Array.from(await diskReadFile(path));
  },
};

function validationError(message: string): DeepSeekToolError {
  return new DeepSeekToolError(message, "validation");
}

function invalidResponse(): DeepSeekToolError {
  return new DeepSeekToolError("DeepSeek OCR API returned an invalid response.", "response");
}

export function isOcrPurpose(value: unknown): value is OcrPurpose {
  return typeof value === "string" && OCR_PURPOSES.some((purpose) => purpose === value);
}

function isOcrFinishReason(value: unknown): value is OcrFinishReason {
  return typeof value === "string" && OCR_FINISH_REASONS.some((reason) => reason === value);
}

export function normalizeOcrInput(input: unknown, cwd: string): NormalizedOcrRequest {
  if (!isRecord(input) || typeof input.path !== "string") {
    throw validationError("path must be a string.");
  }
  const rawPath = input.path.startsWith("@") ? input.path.slice(1) : input.path;
  if (rawPath.trim().length === 0 || CONTROL_CHARACTERS.test(rawPath)) {
    throw validationError("path must be a non-empty local file path without control characters.");
  }
  if (!Check(DS_OCR_PARAMS, input)) {
    throw validationError(
      "path must be a non-empty string and purpose must be a supported OCR mode.",
    );
  }
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Check validates the purpose enum
  const purpose = (input.purpose ?? DEFAULT_OCR_PURPOSE) as OcrPurpose;
  const path = resolve(cwd, rawPath);
  const filename = basename(path);
  if (filename.length === 0) {
    throw validationError("path must include a file name.");
  }
  return { path, filename, purpose };
}

async function inspectFile(path: string, fileSystem: OcrFileSystem): Promise<OcrFileStats> {
  try {
    return await fileSystem.stat(path);
  } catch (error) {
    throw new DeepSeekToolError(`Failed to inspect OCR file: ${errorMessage(error)}`, "filesystem");
  }
}

async function readFileBytes(path: string, fileSystem: OcrFileSystem): Promise<readonly number[]> {
  try {
    return await fileSystem.readFile(path);
  } catch (error) {
    throw new DeepSeekToolError(`Failed to read OCR file: ${errorMessage(error)}`, "filesystem");
  }
}

async function readOcrFile(
  request: NormalizedOcrRequest,
  fileSystem: OcrFileSystem,
): Promise<readonly number[]> {
  const stats = await inspectFile(request.path, fileSystem);
  if (!stats.isFile()) {
    throw validationError("path must refer to a regular file.");
  }
  if (stats.size > MAX_OCR_FILE_BYTES) {
    throw validationError(`OCR file exceeds the ${MAX_OCR_FILE_BYTES}-byte limit.`);
  }
  const bytes = await readFileBytes(request.path, fileSystem);
  if (bytes.length > MAX_OCR_FILE_BYTES) {
    throw validationError(`OCR file exceeds the ${MAX_OCR_FILE_BYTES}-byte limit.`);
  }
  return bytes;
}

function assertNoEmbeddedError(payload: unknown): void {
  if (!isRecord(payload)) return;
  const error = payload.error;
  if (!isRecord(error) || typeof error.message !== "string") return;
  throw new DeepSeekToolError(`DeepSeek OCR API: ${error.message}`, "response");
}

function requiredInteger(value: unknown, field: string): number {
  const parsed = finiteNumber(value, field, "OCR");
  if (!Number.isInteger(parsed)) throw invalidResponse();
  return parsed;
}

function parseOcrPage(entry: unknown): OcrPage {
  if (!isRecord(entry)) throw invalidResponse();
  const finishReason: unknown = entry.finish_reason;
  if (!isOcrFinishReason(finishReason)) throw invalidResponse();
  return {
    index: requiredInteger(entry.index, "index"),
    text: requiredString(entry.text, "text", "OCR"),
    finish_reason: finishReason,
  };
}

function parseOcrResponse(payload: unknown): DeepSeekOcrResponse {
  assertNoEmbeddedError(payload);
  if (!isRecord(payload) || !Array.isArray(payload.pages)) throw invalidResponse();
  const usage = payload.usage;
  if (!isRecord(usage)) throw invalidResponse();
  const object = requiredString(payload.object, "object", "OCR");
  if (object !== OCR_RESULT_OBJECT) throw invalidResponse();
  const purpose: unknown = payload.purpose;
  if (!isOcrPurpose(purpose)) throw invalidResponse();

  const id = requiredString(payload.id, "id", "OCR");
  const created = requiredInteger(payload.created, "created");
  const pageCount = requiredInteger(payload.page_count, "page_count");
  const pages = payload.pages.map((entry) => parseOcrPage(entry));
  if (pageCount !== pages.length) throw invalidResponse();

  return {
    id,
    object: OCR_RESULT_OBJECT,
    created,
    purpose,
    page_count: pageCount,
    pages,
    usage: {
      input_tokens: requiredInteger(usage.input_tokens, "input_tokens"),
      output_tokens: requiredInteger(usage.output_tokens, "output_tokens"),
      total_tokens: requiredInteger(usage.total_tokens, "total_tokens"),
    },
  };
}

export async function ocrDeepSeek(
  request: NormalizedOcrRequest,
  apiKey: string,
  options: OcrClientOptions = {},
): Promise<DeepSeekOcrResponse> {
  if (!apiKey) {
    throw new DeepSeekToolError("Missing DeepSeek API key.", "auth");
  }

  const { fileSystem, ...requestOptions } = options;
  const bytes = await readOcrFile(request, fileSystem ?? DEFAULT_OCR_FILE_SYSTEM);
  const formData = new FormData();
  formData.append("purpose", request.purpose);
  formData.append("file", new File([Uint8Array.from(bytes)], request.filename));

  const payload = await postDeepSeekFormData({
    ...requestOptions,
    endpoint: DEEPSEEK_OCR_URL,
    apiName: "OCR",
    apiKey,
    formData,
  });
  return parseOcrResponse(payload);
}
