import type { DeepSeekToolErrorKind, ToolApiName } from "./types";

export class DeepSeekToolError extends Error {
  constructor(
    message: string,
    readonly kind: DeepSeekToolErrorKind,
    readonly status?: number,
  ) {
    super(message);
    this.name = "DeepSeekToolError";
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function isAbortError(error: unknown, signal?: Readonly<AbortSignal>): boolean {
  if (signal?.aborted === true) return true;
  return error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError");
}

export function requiredString(value: unknown, field: string, apiName: ToolApiName): string {
  if (typeof value !== "string") {
    throw new DeepSeekToolError(
      `DeepSeek ${apiName} API returned an invalid ${field}.`,
      "response",
    );
  }
  return value;
}

export function nullableString(value: unknown, field: string, apiName: ToolApiName): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") {
    throw new DeepSeekToolError(
      `DeepSeek ${apiName} API returned an invalid ${field}.`,
      "response",
    );
  }
  return value;
}

export function finiteNumber(value: unknown, field: string, apiName: ToolApiName): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new DeepSeekToolError(
      `DeepSeek ${apiName} API returned an invalid ${field}.`,
      "response",
    );
  }
  return value;
}

export function toUserMessage(error: unknown): string {
  if (error instanceof DeepSeekToolError) return error.message;
  return error instanceof Error ? error.message : String(error);
}
