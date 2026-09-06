import { existsSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const manifest = JSON.parse(readFileSync(join(root, "assets", "skins.json"), "utf8"));
const missing = [];
const invalid = [];
const splitSkins = new Set(manifest.individualEyeSkins ?? []);
const maskSkins = new Set(manifest.maskSkins ?? []);

function isPng(path) {
  if (!existsSync(path)) return false;
  const header = readFileSync(path, { start: 0, end: 7 });
  return header.length >= 8
    && header[0] === 137
    && header[1] === 80
    && header[2] === 78
    && header[3] === 71
    && header[4] === 13
    && header[5] === 10
    && header[6] === 26
    && header[7] === 10;
}

for (const skin of manifest.skins) {
  const skinDir = join(root, "assets", "skins", skin);
  const required = [...manifest.reactions.map((reaction) => `${reaction}.png`), "thumbnail.png"];
  if (splitSkins.has(skin)) {
    required.push(...manifest.reactions.flatMap((reaction) => [`left/${reaction}.png`, `right/${reaction}.png`]));
  }
  if (maskSkins.has(skin)) required.push("masks/tab-panel.png");
  for (const filename of required) {
    const path = join(skinDir, filename);
    if (!existsSync(path)) missing.push(path);
    else if (!isPng(path)) invalid.push(path);
  }
}

if (missing.length || invalid.length) {
  if (missing.length) console.error(`Missing PNG assets:\n${missing.join("\n")}`);
  if (invalid.length) console.error(`Invalid PNG assets:\n${invalid.join("\n")}`);
  process.exit(1);
}

const pairAssets = manifest.skins.length * (manifest.reactions.length + 1);
const eyeAssets = splitSkins.size * manifest.reactions.length * 2;
const maskAssets = maskSkins.size;
console.log(`Validated ${pairAssets + eyeAssets + maskAssets} PNG assets (${eyeAssets} individual eye assets, ${maskAssets} mask assets).`);
