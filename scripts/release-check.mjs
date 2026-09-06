import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const requiredReleaseAssets = ["main.js", "manifest.json", "styles.css"];
const errors = [];

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

const pkg = readJson(join(root, "package.json"));
const manifest = readJson(join(root, "manifest.json"));
const versions = readJson(join(root, "versions.json"));

if (pkg.version !== manifest.version) {
  errors.push(`package.json version ${pkg.version} does not match manifest.json version ${manifest.version}`);
}

if (!versions[manifest.version]) {
  errors.push(`versions.json is missing ${manifest.version}`);
}

for (const asset of requiredReleaseAssets) {
  const path = join(root, asset);
  if (!existsSync(path)) {
    errors.push(`Missing release asset ${asset}`);
    continue;
  }
  if (statSync(path).size === 0) {
    errors.push(`Release asset ${asset} is empty`);
  }
}

if (manifest.description?.includes("Obsidian")) {
  errors.push("manifest.json description must not include the word Obsidian");
}

if (manifest.authorUrl?.includes("/GooglyEyes")) {
  errors.push("manifest.json authorUrl should point to a profile, not the plugin repository");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Release ${manifest.version} is ready with ${requiredReleaseAssets.join(", ")}.`);
