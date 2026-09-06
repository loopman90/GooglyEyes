import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(root, "manifest.json"), "utf8"));
const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const versions = JSON.parse(readFileSync(join(root, "versions.json"), "utf8"));
const changelog = readFileSync(join(root, "CHANGELOG.md"), "utf8");

const errors = [];
const version = manifest.version;

if (pkg.version !== version) {
  errors.push(`package.json version ${pkg.version} does not match manifest.json version ${version}`);
}

if (versions[version] !== manifest.minAppVersion) {
  errors.push(`versions.json must map ${version} to minAppVersion ${manifest.minAppVersion}`);
}

if (!changelog.includes(`## ${version}`)) {
  errors.push(`CHANGELOG.md is missing section ## ${version}`);
}

if (version.startsWith("v")) {
  errors.push("Version must not start with v; Obsidian release tags use plain SemVer");
}

if (/Obsidian/i.test(manifest.description)) {
  errors.push("manifest.json description must not include the word Obsidian");
}

if (manifest.authorUrl === "https://github.com/loopman90/GooglyEyes") {
  errors.push("manifest.json authorUrl must point to the author profile, not the plugin repository");
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log(`Version ${version} is consistent.`);
