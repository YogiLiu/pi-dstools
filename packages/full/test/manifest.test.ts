import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { hostCast } from "../../deepseek/test/fixtures";

interface PackageManifest {
  readonly name: string;
  readonly dependencies: Readonly<Record<string, string>>;
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
  it("bundles every DeepSeek tool package", () => {
    expect(manifest.name).toBe("@pi-dstools/full");
    expect(Object.keys(manifest.dependencies).toSorted()).toEqual([
      "@pi-dstools/fetch",
      "@pi-dstools/ocr",
      "@pi-dstools/search",
    ]);
  });

  it("declares compact extension entry points", () => {
    expect(manifest.pi.extensions).toEqual([
      "./extensions/search/index.ts",
      "./extensions/fetch/index.ts",
      "./extensions/ocr/index.ts",
    ]);
    expect(manifest.pi.changelogPath).toBe("./CHANGELOG.md");
    for (const entry of manifest.pi.extensions) {
      expect(existsSync(new URL(entry, packageRoot))).toBe(true);
    }
    expect(manifest.files).toContain("extensions");
  });
});
