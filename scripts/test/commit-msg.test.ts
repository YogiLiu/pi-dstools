import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const require = createRequire(import.meta.url);
const cliPath = require.resolve("@commitlint/cli/cli.js");
const workspaceRoot = fileURLToPath(new URL("../../", import.meta.url));

function lint(message: string) {
  const result = spawnSync(process.execPath, [cliPath], {
    cwd: workspaceRoot,
    encoding: "utf8",
    input: `${message}\n`,
  });
  if (result.error) {
    throw result.error;
  }
  return result.status ?? 1;
}

function acceptsConventionalMessages() {
  const messages = [
    "feat: add commit message hook",
    "fix(search): handle empty results",
    "docs: update readme",
    "chore: bump dependencies",
    "revert: undo broken change",
    `feat: ${"a".repeat(66)}`,
    "feat(api)!: drop v1 endpoints\n\nBREAKING CHANGE: Clients must use v2 endpoints.",
    "refactor: simplify parsing\n\nBody explains why.\n\nRefs: #12",
  ];
  for (const message of messages) {
    expect(lint(message)).toBe(0);
  }
}

function rejectsNonConventionalMessages() {
  const messages = [
    "add commit message hook",
    "feature: add commit message hook",
    "feat: add hook.",
    "feat: ",
    "FEAT: add hook",
    `feat: ${"a".repeat(67)}`,
  ];
  for (const message of messages) {
    expect(lint(message)).not.toBe(0);
  }
}

function ignoresGitGeneratedMessages() {
  const messages = [
    'Merge branch "main" into feature/x',
    "Merge pull request #1 from YogiLiu/ci/npm-release",
    'Revert "feat: add hook"\n\nThis reverts commit abc123.',
    "fixup! feat: add hook",
    "squash! feat: add hook",
    "amend! feat: add hook",
  ];
  for (const message of messages) {
    expect(lint(message)).toBe(0);
  }
}

describe("commit message rules", () => {
  it("accepts conventional messages", acceptsConventionalMessages);
  it("rejects non-conventional messages", rejectsNonConventionalMessages);
  it("ignores Git-generated messages", ignoresGitGeneratedMessages);
});
