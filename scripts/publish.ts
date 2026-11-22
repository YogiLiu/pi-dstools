import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

type Manifest = {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
};

type WorkspacePackage = {
  directory: string;
  manifestPath: string;
  manifest: Manifest;
};

const root = process.cwd();
const packagesRoot = join(root, "packages");
const releaseTag = process.env.RELEASE_TAG;
const releaseNotes = process.env.RELEASE_NOTES ?? "";
const dryRun = process.env.PUBLISH_DRY_RUN === "1";

const tagMatch = /^v(\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?)$/u.exec(releaseTag ?? "");
const version = tagMatch?.[1];
if (version === undefined || version.length === 0) {
  throw new Error(`Unexpected release tag: ${releaseTag ?? ""}`);
}
const date = new Date().toISOString().slice(0, 10);

const run = (command: string, args: readonly string[]): void => {
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
};

const isManifest = (value: unknown): value is Manifest =>
  typeof value === "object" &&
  value !== null &&
  "name" in value &&
  typeof value.name === "string" &&
  "version" in value &&
  typeof value.version === "string";

const readManifest = (path: string): Manifest => {
  const parsed: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isManifest(parsed)) {
    throw new Error(`Invalid manifest: ${path}`);
  }
  return parsed;
};

const packages: WorkspacePackage[] = [];
for (const entry of readdirSync(packagesRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const directory = join(packagesRoot, entry.name);
  const manifestPath = join(directory, "package.json");
  packages.push({ directory, manifestPath, manifest: readManifest(manifestPath) });
}

for (const { manifestPath, manifest } of packages) {
  manifest.version = version;
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

if (releaseNotes.trim()) {
  const body = releaseNotes
    .trim()
    .replace(/^##[^\n]*\n+/u, "")
    .trimEnd();
  const section = `## [${version}] - ${date}\n\n${body}\n\n`;
  for (const { directory } of packages) {
    const changelogPath = join(directory, "CHANGELOG.md");
    if (!existsSync(changelogPath)) continue;
    const changelog = readFileSync(changelogPath, "utf8");
    const header = "# Changelog\n";
    if (!changelog.startsWith(header)) {
      throw new Error(`Unexpected changelog header: ${changelogPath}`);
    }
    const previous = changelog.slice(header.length).replace(/^\n+/u, "");
    writeFileSync(changelogPath, `${header}\n${section}${previous}`);
  }
}

run("pnpm", ["exec", "oxfmt", "--write", "packages/*/CHANGELOG.md"]);
run("pnpm", ["fmt:check"]);
run("pnpm", ["pack:dry-run"]);

const byName = new Map<string, WorkspacePackage>();
for (const entry of packages) {
  byName.set(entry.manifest.name, entry);
}
const ordered: string[] = [];
const visiting = new Set<string>();
const visited = new Set<string>();

const visit = (name: string): void => {
  if (visited.has(name)) return;
  if (visiting.has(name)) {
    throw new Error(`Circular workspace dependency: ${name}`);
  }
  visiting.add(name);
  const workspacePackage = byName.get(name);
  if (!workspacePackage) {
    throw new Error(`Missing workspace package: ${name}`);
  }
  for (const dependency of Object.keys(workspacePackage.manifest.dependencies ?? {})) {
    if (byName.has(dependency)) visit(dependency);
  }
  visiting.delete(name);
  visited.add(name);
  ordered.push(name);
};

for (const { manifest } of packages) visit(manifest.name);

const tarballDirectory = mkdtempSync(join(tmpdir(), "pi-dstools-publish-"));
try {
  for (const name of ordered) {
    const spec = `${name}@${version}`;
    const lookup = spawnSync("npm", ["view", spec, "version", "--json"], {
      cwd: root,
      stdio: "pipe",
    });
    if (lookup.status === 0) {
      process.stdout.write(`Skipping ${spec}: already on npm\n`);
      continue;
    }

    run("pnpm", ["--filter", name, "pack", "--pack-destination", tarballDirectory]);
    const tarballs = readdirSync(tarballDirectory).filter((file) => file.endsWith(".tgz"));
    const tarballName = tarballs[0];
    if (tarballs.length !== 1 || tarballName === undefined) {
      throw new Error(`Expected one tarball for ${name}, found ${tarballs.length}`);
    }
    const tarball = join(tarballDirectory, tarballName);
    if (dryRun) {
      process.stdout.write(`Dry run: would publish ${spec}\n`);
    } else {
      run("npm", ["publish", tarball, "--access", "public"]);
    }
    rmSync(tarball);
  }
} finally {
  rmSync(tarballDirectory, { recursive: true, force: true });
}
