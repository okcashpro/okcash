import { statSync } from "fs";
import { join } from "path";
import { arch, platform } from "process";
import { fileURLToPath } from 'url';
import path from 'path';

// Get the file path of the current module
const __filename = fileURLToPath(import.meta.url);

// Get the directory name of the current module
const __dirname = path.dirname(__filename);


// TypeScript definitions
export interface Database {
  loadExtension(file: string, entrypoint?: string | undefined): void;
}

const supportedPlatforms: [string, string][] = [
  ["darwin", "x64"],
  ["darwin", "arm64"],
  ["linux", "x64"],
];

function validPlatform(platform: string, arch: string): boolean {
  return supportedPlatforms.some(([p, a]) => platform === p && arch === a);
}

function extensionSuffix(platform: string): string {
  if (platform === "win32") return "dll";
  if (platform === "darwin") return "dylib";
  return "so";
}

function platformPackageName(platform: string, arch: string): string {
  const os = platform === "win32" ? "windows" : platform;
  return `sqlite-vss-${os}-${arch}`;
}

function loadablePathResolver(name: string): string {
  if (!validPlatform(platform, arch)) {
    throw new Error(
      `Unsupported platform for sqlite-vss, on a ${platform}-${arch} machine, but not in supported platforms (${supportedPlatforms
        .map(([p, a]) => `${p}-${a}`)
        .join(",")}). Consult the sqlite-vss NPM package README for details.`,
    );
  }

  const packageName = platformPackageName(platform, arch);
  let loadablePath = join(
    __dirname,
    "..",
    "node_modules",
    packageName,
    "lib",
    `${name}.${extensionSuffix(platform)}`,
  );

  // if loadable path doesnt exist, check path2
  if (!statSync(loadablePath, { throwIfNoEntry: false })) {
    loadablePath = join(
      __dirname,
      "..",
      "..",
      "..",
      packageName,
      "lib",
      `${name}.${extensionSuffix(platform)}`,
    );
  }

  if (!statSync(loadablePath, { throwIfNoEntry: false })) {
    throw new Error(
      `Loadable extension for sqlite-vss not found. Was the ${packageName} package installed? Avoid using the --no-optional flag, as the optional dependencies for sqlite-vss are required.`,
    );
  }

  return loadablePath;
}

export function getVectorLoadablePath(): string {
  return loadablePathResolver("vector0");
}

export function getVssLoadablePath(): string {
  return loadablePathResolver("vss0");
}

export function loadVector(db: Database): void {
  db.loadExtension(getVectorLoadablePath());
}

export function loadVss(db: Database): void {
  db.loadExtension(getVssLoadablePath());
}

export function load(db: Database): void {
  loadVector(db);
  loadVss(db);
}
