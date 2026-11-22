import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { hostCast } from "./helpers";

interface PackageManifest {
  readonly name: string;
  readonly version: string;
  readonly files: readonly string[];
  readonly pi: {
    readonly extensions: readonly string[];
    readonly changelogPath: string;
  };
}

const packageRoot = new URL("../", import.meta.url);
const manifest = hostCast<PackageManifest>(
  JSON.parse(readFileSync(new URL("package.json", packageRoot), "utf8")),
);

describe("Pi package manifest", () => {
  it("declares the OCR package and compact extension entry points", () => {
    expect(manifest.name).toBe("@pi-dstools/ocr");
    expect(manifest.version).toBeTypeOf("string");
    expect(manifest.pi.extensions).toEqual(["./extensions/index.ts"]);
    expect(manifest.pi.changelogPath).toBe("./CHANGELOG.md");
    for (const entry of manifest.pi.extensions) {
      expect(existsSync(new URL(entry, packageRoot))).toBe(true);
    }
    expect(manifest.files).toEqual(["src", "extensions", "README.md", "CHANGELOG.md"]);
  });
});
