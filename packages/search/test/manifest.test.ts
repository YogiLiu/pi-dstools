import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { hostCast } from "./helpers";

interface PackageManifest {
  readonly files: readonly string[];
  readonly pi: {
    readonly extensions: readonly string[];
  };
}

const packageRoot = new URL("../", import.meta.url);
const manifest = hostCast<PackageManifest>(
  JSON.parse(readFileSync(new URL("package.json", packageRoot), "utf8")),
);

describe("Pi package manifest", () => {
  it("declares compact extension entry points", () => {
    expect(manifest.pi.extensions).toEqual(["./extensions/index.ts"]);
    for (const entry of manifest.pi.extensions) {
      expect(existsSync(new URL(entry, packageRoot))).toBe(true);
    }
    expect(manifest.files).toContain("extensions");
  });
});
