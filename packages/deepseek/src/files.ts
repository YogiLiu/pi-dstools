import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir as systemTmpdir } from "node:os";
import { join } from "node:path";

import { DeepSeekToolError, errorMessage } from "./errors";
import type {
  ContentFileSystem,
  ContentOptions,
  ContentWrite,
  ResolvedContentOptions,
} from "./types";

export const DEFAULT_FILE_SYSTEM: ContentFileSystem = {
  async mkdir(path, options) {
    await mkdir(path, options);
  },
  async writeFile(path, data, encoding) {
    await writeFile(path, data, encoding);
  },
};

export function resolveContentOptions(options: ContentOptions = {}): ResolvedContentOptions {
  return {
    makeTempDir: options.tmpdir ?? systemTmpdir,
    makeUuid: options.uuid ?? randomUUID,
    fileSystem: options.fs ?? DEFAULT_FILE_SYSTEM,
  };
}

export function contentDirectory(root: string, tool: string, id: string): string {
  return join(root, "pi-dstools", tool, id);
}

export async function writeContentFiles(
  fileSystem: ContentFileSystem,
  directory: string,
  writes: readonly ContentWrite[],
  failureMessage: string,
): Promise<void> {
  if (writes.length === 0) return;
  try {
    await fileSystem.mkdir(directory, { recursive: true });
    await Promise.all(
      writes.map(({ path, content }) => fileSystem.writeFile(path, content, "utf8")),
    );
  } catch (error) {
    throw new DeepSeekToolError(`${failureMessage}: ${errorMessage(error)}`, "filesystem");
  }
}
